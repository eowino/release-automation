# Features

## Idea 1 - bookkeeping

When the CLI is run, consider saving the options passed to it as well as the progress of the code in a file (e.g. `release-progress.json`).
This way, if for any reason the CLI is unable to run to completion, it can be invoked again with the `--resume` flag which will look for the `release-progress.json`
file and carry on from there.

An example on such an issue could be during the merging of branches. If the CLI comes across a merge-conflict, it can exit its operation, let the user
solve the conflicts and then run the CLI again with the `--resume` flag.

Should the CLI fail to find the `release-progress.json` file, it will alert the user that they need to start from scratch.

Once everything has run to completion, the `release-progress.json` will be deleted.

## Idea 2 - `--resume` flag

As mentioned above, the idea of resuming work from a certain checkpoint
