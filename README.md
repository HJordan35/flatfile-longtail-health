# Getting Started

If you're just getting started with Flatfile, you're in the right place.

This code supports [Flatfile's Beginner Tutorial](https://flatfile.com/docs/quickstart), a four-step walkthrough that helps you create your first data import experience.

1. Import and extract your data: Setup a listener
2. Process your data: Transform and validate data
3. Export your data: Configure a submit Action

## Setup your environment variables

Before you begin, set up your environment variables. Rename `.env.example` to `.env` and update it with your credentials.

Your `.env` file should look similar to this:

```
FLATFILE_ENVIRONMENT_ID=us_env_1234
FLATFILE_API_KEY=sk_1234
```

## The concept of Listeners / Agents

Your process of using the `initializeFlatfile(config)` will remain consistent - What that wil do:

- On launch of the embed, a space, workbook, and sheets will be created according to the config you provide
- As soon as those processes begin, a series of events will be emitted for all application behaviors (i.e. `space:created`, `workbook:created`, `sheet:created`, etc.)
- This code will handle setting up listeners, and recordHooks - both of which are responsible for listening for specific events - and then performing custom logic accordingly depending on what you need

Whenever you DEPLOY, we refer to that as deploying an "Agent" - since an agent is going to be the construct responsible for running the code you deploy.

## Adding your logic

Essentially, you now have a Typescript ecosystem where you can add your logic. I have added a few examples in typescript/index.ts where you can see some setups. But ultimately, you can then break this into a fully 
fledged application as things evolve and become more complex.

Once the code is "ready" you can then either run your listeners locally, or deploy them to your environments (see steps below)

## Development / Deployment Recommendations 

hen doing development, you have 2 options

1. Deploy with LOCAL listeners - essentially have the listener code running on your machine while you interact with the embed
2. Deploy with DEPLOYED listeners - have the listener code running on a server, which is what you'll do when you're ready to deploy

I usually make sure I have 3 ENVIRONMENTS set up in my Dashboard

1. Dev-Local - Here is where I run `npm run dev:ts` to start a local listener
2. Dev-Deployed - Here is where I run `npm run deploy:ts` to deploy a version of my listener that is running on a server
3. Prod - Here is where I run `npm run deploy:ts` to deploy a version of my listener that is running on a server when Im confident in my changes

NOTE: The reason for this separation, is you can get some funny business if you run both a local and deployed version of the listener at the same time - since BOTH will be trying to listen for the same events. If you
ever accidentally deploy to an envionrment by mistake, you can easily remove it via the Dashboard "Agents" page.

Guidance and context for these steps can be found in our [Beginner Tutorial Documentation](https://flatfile.com/docs/quickstart).
