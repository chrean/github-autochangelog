# github-autochangelog

Easily create a changelog for any GitHub repo by listing all merged PRs between two releases, or between one release and the current time.

## Usage

Clone the repo.

Copy the supplied `.env.example` file to `.env`. In the new `.env` file, change the value of `GITHUB_API_TOKEN` to your personal GitHub token.

Install dependencies: `npm i` (within the repo folder)

Run the script (refer to the inline help for further information on command line arguments):

`node index.js -o <owner> -r <repo> -p <previous Release> [-c <current-release>]`

Copy the output and paste it into the release on GitHub. PR tags will be automatically converted into links.
Once the release has been saved, you can copy/paste to other places like P2 and the changelog will be complete with links.


