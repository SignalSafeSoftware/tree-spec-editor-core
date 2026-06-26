import { runSmokePackage } from './smoke-package-lib.mjs';

runSmokePackage({
    runtimeChecks: [
        {
            subpath: '.',
            exports: ['END_NODE_ID', 'lintEditorTree', 'autoLayoutTree'],
        },
    ],
    typecheckSubpaths: ['.'],
});
