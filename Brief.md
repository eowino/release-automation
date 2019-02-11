# Task to automate release process

## Steps

1. Git checkout a new branch from master - let’s call it BRANCH_X

2. Merge feature branches into BRANCH_X

3. Use npm version to bump the version to a particular version
   1. Given the latest release version is 1.0.0
   2. Form the branches you have merged in, if 2 were minor fixes and 1 a patch, then the next version will be 1.2.1
4. Push the tags to GitHub from BRANCH_X using git push —tags

5. Merge BRANCH_X into the preprod branch

6. After a while, once everything looks good, merge the preprod branch into the master branch

7. Create a changelog
