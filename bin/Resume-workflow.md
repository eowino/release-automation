# Steps to follow

0. A `release-config.json` file was found. Would you like to resume with your previous release?
   - Accept are resume flag and read from release-config.json
1. Print the following
   - "Using `branchName`"
   - Previously selected branches: [a, b, c]
   - Successfully merged branches: [a] (check `.length > 0` and print if true)
   - Will now merge: [b, c]

# TODOs

- everywhere there's a call to git merge should use the `It seems a merge failed` error message too ✅
- change all usages of `spawn` to `exec` ✅
- use initial state
- consider switching from 'Would you like to push to a staging branch?' to 'create a PR into a staging branch'
