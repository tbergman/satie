Ripieno Preview »  webapp
=========================

See the parent README for information about Ripieno, and how to build the webapp.

JSX-flavoured TypeScript
------------------------
This application uses [JSX-flavoured TypeScript](https://github.com/ripieno/typescript-react-jsx).
It works like JSX, except with `<!` instead of `<`. And you get to use types. The Visual Studio
integration is a bit lacking (you won't have IntelliSence or syntax highlighting for JSX blocks,
for example). If we ever decide to move to JSX with Flow type annotations, we'll replace `<!` with `<`.

Testing
-------
We use [Karma](https://github.com/karma-runner/karma). Anything that matches `src/**/test/*.ts` is tested. For example,
`src/stores/test/annotation.ts` and `src/promos/scales/test/scaleGenerator.ts` are both tested. Tests are run on Travis
(see the badge in the parent directory), and as part of `npm run build`. You can also run tests by themselves:

    npm run test

Deploying
---------
We tag a release with git, push it, modify [the deploy spec](https://gist.github.com/jnetterf/28a1ff1a6f647f1185fb),
and then launch a new Docker container. We keep the old container running for a bit incase we need to roll back.
We keep the database on a seperate server and container.

Structure
---------
- `/build`: Holds the results of the build process. Any changes you make in this folder will be lost.

 - `browser-bundle.js`: The webapp for the browser. To build and watch, see the parent README.
    To build a minified production version, run
   
        npm run build

 - `chore-server.js`: Used by the backend to generate SVGs, PNGs, MP3s, and to do other tasks.
    It is built **once** as part of the watch process, so you'll need to kill the watch server
    and start it again to see updates.
    
 - `deps.min.js`: Test cases run by mocha. Tests are run as part of the build process, and on Travis.
 
 - `libripienoclientBridge-bundle.js`: Required by the native apps. To build it, run:
 
          npm run build
          npm run build-libripienoclient

 - `suite.js`: This file includes require statements for all the test files. It is used to create `deps.min.js`,
    which in turn is used for testing.

- `/nginx`: Configuration for the dev and production file servers.

- `/references`: TypeScript `.d.ts` files, mostly from DefinitelyTyped.

- `/res`: Resources used by the webapp, such as images, fonts, etc.

- `/third_party`: Includes modules that are not available on `npm`.

- `/src`

 - `/ui`: Contains the interface of the site, excluding the sheet music rendering.
 
 - `/promos/scales`: [A scale generator](https://ripieno.io/scales)
 
 - `/renderer`: Contains the two renderers.
 
  - `/molassess.ts`: The SVG renderer, used for the website. It simply passes children through `<!svg />`.
  
  - `/victoria`: The OpenGL ES renderer, which will be used for the apps. It is based on
    [React ART](https://github.com/reactjs/react-art).
    
 - `/stores`: Contains the [Flux](https://facebook.github.io/flux/docs/overview.html) stores and models they use.
    This is where all the tools, models live, and where all the sheet music logic lives.
    
     - Stores
       - `session.ts`: The Session store, which holds information about the current user and her songs.
       - `songEditor.ts`: The SongEditor store, used to modify and view the current song.
       - `playback.ts`: The Playback store, which loads instruments and plays sounds.
       - `notations.ts`: Holds information about the most recently used notations (symbols).
       
     - Other important files:
       - `contracts.ts`: Contains a bunch of structures, referred to as `C` throughout the codebase.
       - `model.ts`: The base type for Clefs, Notes, Beams, ...
       - `tool.ts`: The base type for anything that modifies the sheet music.
       - `annotator.ts`: Loads sheet music, and performs all modifications to sheet music.
       
 - `/views`: React components that the Renderer renders, based on specifications from the SongEditor store. Files
    that begin with `_` are not used directly by 
    
 - `/util`: The stuff that doesn't really belong anywhere else.
