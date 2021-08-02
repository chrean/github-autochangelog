const { InMemoryCache } = require( 'apollo-cache-inmemory' );
const { ApolloClient }= require( 'apollo-client' );
const { onError } = require( 'apollo-link-error' );
const { createHttpLink } = require( 'apollo-link-http' );
const { gql } = require( 'apollo-server' );
const fetch = require( 'node-fetch' );

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

const index = gql`{
  search(first: 100, query: "repo:Automattic/vip-go-internal-cli is:pr is:merged merged:2021-07-22..2021-08-02", type: ISSUE) {
    nodes {
      ... on PullRequest {
        title
        url
      }
    }
  }
}`;

getGraphQLClient().then( async client => {
	try {
		console.log( 'Connecting...' );
		const result = await client.query( {
			query: index
		} );
		console.log( 'Finished querying GitHub GraphQL API, results:' );

		if( ! result.data.search.nodes.length ) {
			return console.log( 'No PRs found' );
		}
		return console.log( result.data.search.nodes.length );
	} catch ( e ) {
		console.log( `Error querying GitHub GraphQL API ${ JSON.stringify( e ) }` );
	}
} );

