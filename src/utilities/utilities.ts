import { coerce } from 'semver';
import { INextRelease } from '../types/Utilities';

export function bufferToString(buffer: Buffer): string {
  return buffer.toString('utf8').trim();
}

/**
 * @description Intentionally only supports patch and minors
 */
export function suggestNextReleaseVersion(
  currentVersion: string,
  branchNames: string[],
): string {
  const semver = coerce(currentVersion);
  const initialRelease: INextRelease = {
    feat: 0,
    fix: 0,
  };

  if (!semver) {
    return null;
  }

  const nextRelease = branchNames.reduce((release, branchName) => {
    if (branchName.includes('feat/')) {
      release.feat = release.feat + 1;
    } else if (branchName.includes('fix/')) {
      release.fix = release.fix + 1;
    }

    return release;
  }, initialRelease);

  const newSemver = getIncrementedVersion(currentVersion, nextRelease);

  return coerce(newSemver).version;
}

function getIncrementedVersion(
  currentVersion: string,
  nextRelease: INextRelease,
) {
  const { minor, patch, major } = coerce(currentVersion);
  return `${major}.${minor + nextRelease.feat}.${patch + nextRelease.fix}`;
}

export function generateReleaseURL(
  gitRemoteOriginURL: string,
  releaseVersion: string,
): string {
  const delimeter = gitRemoteOriginURL.startsWith('git') ? ':' : '/';
  const [_, ownerAndRepo] = gitRemoteOriginURL.split(`github.com${delimeter}`);
  const [owner, repoWithGit] = ownerAndRepo.split('/');
  const repo = repoWithGit.substring(0, repoWithGit.length - 4);

  return `https://github.com/${owner}/${repo}/releases/new?tag=v${releaseVersion}`;
}

export function matchStringsFromPattern(patterns: string[], strings: string[]) {
  return strings.filter(value => {
    return Boolean(
      patterns.find(pattern => value.trim().includes(pattern.trim())),
    );
  });
}

export function formatGitTagVersion(version: string): string {
  return version.includes('.') || Number.isInteger(+version)
    ? `v${version}`
    : version;
}
