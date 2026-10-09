import { readFileSync, writeFileSync } from 'node:fs';
const path = 'android/app/build.gradle';
const source = readFileSync(path, 'utf8');
const release = source.indexOf('        release {');
if (release < 0 || !source.slice(release).includes('signingConfig signingConfigs.debug')) throw new Error('Generated release signing block has changed; review before publishing.');
writeFileSync(path, source.slice(0, release) + source.slice(release).replace('signingConfig signingConfigs.debug', '// Signed by apksigner using the private release key after Gradle completes.'));
