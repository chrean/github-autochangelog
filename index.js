const { InMemoryCache } = require( 'apollo-cache-inmemory' );
const { ApolloClient }= require( 'apollo-client' );
const { onError } = require( 'apollo-link-error' );
const { createHttpLink } = require( 'apollo-link-http' );
const { gql } = require( 'apollo-server' );
const fetch = require( 'node-fetch' );

const { program } = require('commander');

async function getGraphQLClient() {
	const settings = require('dotenv').config().parsed;
	if (settings.error) {
		throw settings.error;
	}

	const token = settings.GITHUB_API_TOKEN;

	if ( ! token ) {
		return console.error( 'Please provide a valid GitHub API token through the .env file. See .env.example.' );
	}

	const GITHUB_GRAPHQL_API_URI = 'https://api.github.com/graphql';

	// TODO could fail authenticating, so we need to add a custom error to ApolloClient
	// We can pass a error handler to the constructor of ApolloClient

	const httpLink = createHttpLink( {
		uri: GITHUB_GRAPHQL_API_URI,
		headers: {
			Authorization: `Bearer ${ token }`,
			// Fallback UA intentionally uses a really old version number to distinguish
			// it from the real values set in the env vars so we know where it's coming from
			//'User-Agent': process.env.HTTP_USER_AGENT || 'wpcomvip-parker/0.0.1',
		},
		fetch,
	} );

	const errorLink = onError( ( { networkError, graphQLErrors } ) => {

		if ( graphQLErrors ) {
			graphQLErrors.forEach( ( { message, locations, path } ) =>
				console.log(
					`[GraphQL error]: Message: ${ message }, Location: ${ locations }, Path: ${ path }`,
				),
			);
		}

		if ( networkError ) {
			console.log( "Network Error Response:" );
			console.log( networkError.name );
			console.log( networkError.result );
			console.log( networkError.response.url );
			console.log( networkError.response.status );
			console.log( networkError.response.statusText );
			const errorDetails = {
				status: networkError.statusCode,
				statusText: networkError.statusText || '',
			};
			console.log( "Error details:" );
			console.log ( errorDetails );
		}
	} );
	const link = errorLink.concat( httpLink );

	return new ApolloClient( {
		link,
		// Apollo 2.x requires one...need to look further if it causes data consistency issues
		cache: new InMemoryCache(),
	} );
}

async function getReleaseDate( owner, repo, releaseTag ) {
	const index = gql`
		query GetReleaseDate($releaseTag: String,$owner: String!, $repo: String!)
		{
  			repository(owner: $owner, name: $repo) {
    			object(expression: $releaseTag) {
      				... on Commit {
        				oid
        				messageHeadline
        				committedDate
        				author {
          					user {
            					login
          					}
        				}
      				}
    			}
  			}
	}`;

	const client = await getGraphQLClient();
	try {
		const result = await client.query( {
			query: index,
			variables: {
				owner,
				repo,
				releaseTag,
			},
		} );

		if( ! result.data.repository.object.committedDate ) {
			return console.log( 'Release date not found' );
		}

		return result.data.repository.object.committedDate;
	} catch ( e ) {
		console.log( `Error querying GitHub GraphQL API ${ JSON.stringify( e ) }` );
	}
}

async function listMergedPRs( owner, repo, startDate, endDate ) {
	const queryString = `repo:${ owner }/${ repo } is:pr is:merged merged:${ startDate }..${ endDate }`;
	const index = gql`query ListMergedSince($queryString: String!){
	  search(first: 100, query: $queryString, type: ISSUE) {
		nodes {
		  ... on PullRequest {
			title
			url
		  }
		}
	  }
	}`;

	const client = await getGraphQLClient();
	try {
		const result = await client.query( {
			query: index,
			variables: {
				queryString,
			},
		} );

		if( ! result.data.search.nodes.length ) {
			return;
		}
		return result.data.search.nodes;
	} catch ( e ) {
		console.log( `Error querying GitHub GraphQL API ${ JSON.stringify( e ) }` );
	}
}

program
	.requiredOption( '-o, --owner <repoOwner>', 'Owner of the repo to extract PRs from' )
	.requiredOption( '-r, --repo <repo>', 'Name of the repository' )
	.requiredOption( '-p, --previous-release <previousTag>', 'Release tag of the previous release')
	.option( '-c, --current-release <currentTag>', 'Release tag of the release to compare to. Leave empty to retrieve up to the latest merged PR' );

program.parse( process.argv );

const options = program.opts();

async function main() {
	const startDate = await getReleaseDate( options.owner, options.repo, options.previousRelease );
	let endDate;
	if ( options.currentRelease ) {
		endDate = await getReleaseDate( options.currentRelease );
	} else {
		endDate = new Date().toISOString().split('T')[0];
	}

	const mergedPRs = await listMergedPRs( options.owner, options.repo, startDate, endDate );
	if ( ! mergedPRs || ! mergedPRs.length ) {
		return console.error( `No merged PRs found between ${ startDate } and ${ endDate }` );
	}
	console.log();
	console.log( `List of merged PRs for ${ options.owner }/${ options.repo } between ${ startDate } and ${ endDate }` );
	console.log();
	for ( const pr of mergedPRs ) {
		const id = pr.url.substring( pr.url.lastIndexOf( '/' ) + 1 );
		console.log( `- ${ pr.title } ( #${ id } )` );
	}
}

main();

