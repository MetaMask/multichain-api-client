# MetaMask MutliChain API Client

This TypeScript module is maintained in the style of the MetaMask team.

## Installation

`yarn add @metamask/multichain-api-client`

or

`npm install @metamask/multichain-api-client``

## Usage

```typescript
import { getMultichainClient, getDefaultTransport } from '@metamask/multichain-api-client';

const client = getMultichainClient({ transport: getDefaultTransport() });
const session = await client.createSession({ requiredScopes: ['eip155:1'] });

const result = await client.invokeMethod({
   scope: 'eip155:1',
   request: {
      method: 'eth_call',
      params: {
         to: '0x1234567890',
         data: '0x1234567890',
      },
   },
});

await client.revokeSession();
```

## Extending RPC Types

The client's RPC requests are strongly typed, enforcing the RPC methods and params to be defined ahead of usage. The client supports extending
the default RPC API with custom methods. This is useful when working with chains that have additional RPC methods beyond
the standard ones.

### Define Custom RPC Types

```typescript
import type { RpcMethod } from '@metamask/multichain-api-client';

// Define your custom RPC structure
type MyCustomRpc = {
  mychain: {
    methods: {
      customMethod: RpcMethod<{ param1: string; param2: number }, { result: string }>;
      anotherMethod: RpcMethod<{ data: string }, boolean>;
    };
    events: ['customEvent'];
  };
};
```

### Use Extended RPC Types

```typescript
import { getMultichainClient, getDefaultTransport } from '@metamask/multichain-api-client';

// Create a client with extended types
const client = getMultichainClient({ transport: getDefaultTransport() })
  .extendsRpcApi<MyCustomRpc>();

// Now you can use your custom methods with full type safety
const result = await client.invokeMethod({
  scope: 'mychain:123', // Your custom chain scope
  request: {
    method: 'customMethod',
    params: { param1: 'hello', param2: 42 }
  }
});
```

## Creating Custom Transports

Transports handle the communication layer between your application and the wallet. You can create custom transports for different environments or communication methods.

### Transport Interface

A transport must implement the following interface:

```typescript
type Transport = {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: () => boolean;
  request: <TRequest, TResponse>(request: TRequest) => Promise<TResponse>;
  onNotification: (callback: (data: unknown) => void) => () => void;
};
```

### Example: Custom Transport

```typescript
import type { Transport, TransportRequest, TransportResponse } from '@metamask/multichain-api-client';

export function getCustomTransport(): Transport {
  return {
    connect: async () => { ... },
    disconnect: async () => { ... },
    isConnected: () => { ...},
    request: async <TRequest extends TransportRequest, TResponse extends TransportResponse>( request: TRequest ): Promise<TResponse> => { ... },
    onNotification: (callback: (data: unknown) => void) => { ... },
  };
}

// Usage
const transport = getCustomTransport();
const client = getMultichainClient({ transport });
```

## Error Handling

The client provides two main error types for handling different failure scenarios:

### TransportError

`TransportError` is thrown when there are issues with the transport layer communication, such as connection failures or the targeted browser extension not being installed.

```typescript
import { TransportError } from '@metamask/multichain-api-client';

try {
  const client = getMultichainClient({ transport: getDefaultTransport() });
  await client.createSession({ optionalScopes: ['eip155:1'] });
} catch (error) {
  if (error instanceof TransportError) {
    console.error('Transport error:', error.message);
    console.error('Original error:', error.cause);
  }
}
```

### MultichainApiError

`MultichainApiError` is thrown when the wallet returns an error response to API requests. This includes permission denials, invalid parameters, and other wallet-specific errors.

```typescript
import { MultichainApiError } from '@metamask/multichain-api-client';

try {
  const result = await client.invokeMethod({
    scope: 'eip155:1',
    request: {
      method: 'eth_sendTransaction',
      params: { to: '0x1234...', value: '0x0' }
    }
  });
} catch (error) {
  if (error instanceof MultichainApiError) {
    console.error('Multichain API error:', error.message);
    console.error('Error details:', error.cause);
  }
}
```

Both error types extend the standard `Error` class and may include the original error in the `cause` property for debugging purposes.

## API

See our documentation:

- [Latest published API documentation](https://metamask.github.io/multichain-api-client/latest/)
- [Latest development API documentation](https://metamask.github.io/multichain-api-client/staging/)

## Contributing

### Setup

- Install the current LTS version of [Node.js](https://nodejs.org)
  - If you are using [nvm](https://github.com/creationix/nvm#installation) (recommended) running `nvm install` will install the latest version and running `nvm use` will automatically choose the right node version for you.
- Install [Yarn](https://yarnpkg.com) v4 via [Corepack](https://github.com/nodejs/corepack?tab=readme-ov-file#how-to-install)
- Run `yarn install` to install dependencies and run any required post-install scripts

### Testing and Linting

Run `yarn test` to run the tests once. To run tests on file changes, run `yarn test:watch`.

Run `yarn lint` to run the linter, or run `yarn lint:fix` to run the linter and fix any automatically fixable issues.

### Release & Publishing

The project follows the same release process as the other libraries in the MetaMask organization. The GitHub Actions [`action-create-release-pr`](https://github.com/MetaMask/action-create-release-pr) and [`action-publish-release`](https://github.com/MetaMask/action-publish-release) are used to automate the release process; see those repositories for more information about how they work.

1. Choose a release version.

   - The release version should be chosen according to SemVer. Analyze the changes to see whether they include any breaking changes, new features, or deprecations, then choose the appropriate SemVer version. See [the SemVer specification](https://semver.org/) for more information.

2. If this release is backporting changes onto a previous release, then ensure there is a major version branch for that version (e.g. `1.x` for a `v1` backport release).

   - The major version branch should be set to the most recent release with that major version. For example, when backporting a `v1.0.2` release, you'd want to ensure there was a `1.x` branch that was set to the `v1.0.1` tag.

3. Trigger the [`workflow_dispatch`](https://docs.github.com/en/actions/reference/events-that-trigger-workflows#workflow_dispatch) event [manually](https://docs.github.com/en/actions/managing-workflow-runs/manually-running-a-workflow) for the `Create Release Pull Request` action to create the release PR.

   - For a backport release, the base branch should be the major version branch that you ensured existed in step 2. For a normal release, the base branch should be the main branch for that repository (which should be the default value).
   - This should trigger the [`action-create-release-pr`](https://github.com/MetaMask/action-create-release-pr) workflow to create the release PR.

4. Update the changelog to move each change entry into the appropriate change category ([See here](https://keepachangelog.com/en/1.0.0/#types) for the full list of change categories, and the correct ordering), and edit them to be more easily understood by users of the package.

   - Generally any changes that don't affect consumers of the package (e.g. lockfile changes or development environment changes) are omitted. Exceptions may be made for changes that might be of interest despite not having an effect upon the published package (e.g. major test improvements, security improvements, improved documentation, etc.).
   - Try to explain each change in terms that users of the package would understand (e.g. avoid referencing internal variables/concepts).
   - Consolidate related changes into one change entry if it makes it easier to explain.
   - Run `yarn auto-changelog validate --rc` to check that the changelog is correctly formatted.

5. Review and QA the release.

   - If changes are made to the base branch, the release branch will need to be updated with these changes and review/QA will need to restart again. As such, it's probably best to avoid merging other PRs into the base branch while review is underway.

6. Squash & Merge the release.

   - This should trigger the [`action-publish-release`](https://github.com/MetaMask/action-publish-release) workflow to tag the final release commit and publish the release on GitHub.

7. Publish the release on npm.

   - Wait for the `publish-release` GitHub Action workflow to finish. This should trigger a second job (`publish-npm`), which will wait for a run approval by the [`npm publishers`](https://github.com/orgs/MetaMask/teams/npm-publishers) team.
   - Approve the `publish-npm` job (or ask somebody on the npm publishers team to approve it for you).
   - Once the `publish-npm` job has finished, check npm to verify that it has been published.
