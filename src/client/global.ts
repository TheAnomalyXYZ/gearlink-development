declare module '*.css';

/** Short commit and build date, stamped by `vite.config.ts`. Undefined under
 *  the node test runner, so read it behind a `typeof` check. */
declare const __BUILD_ID__: string | undefined;
