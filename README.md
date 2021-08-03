# github-autochangelog

Easily create a changelog for any GitHub repo by listing all merged PRs between two releases, or between one release and the current time.

## Usage

### Setup

1. Clone the repo.
2. Copy the supplied `.env.example` file to `.env`.
3. Install dependencies: `npm i` (within the repo folder).

### Configuration

In the `.env` file:

1. Change the value of `GITHUB_API_TOKEN` to your personal GitHub token.
2. Verify and if necessary amend `DEPENDENCY_AUTHORS` by adding any dependency bot you may use. (Note: if you are not using any, this setting won't have any effect)

### Generate the changelog

1. Run the script (refer to the inline help for further information on command line arguments):

```bash
node index.js -o <owner> -r <repo> -p <previous Release> [-c <current-release>]
```

2. Copy the output and paste it into the release on GitHub. PR tags will be automatically converted into links.
Once the release has been saved, you can copy/paste to other places like P2 and the changelog will be complete with links.


