#!/usr/bin/env node
/**
Usage:
web-icons test.svg --output test_icon.js
web-icons --src './test/svg_files' --dest './test/dest'
web-icons --src './test/svg_files' --dest './test/dest' --svgoConfig config.js
web-icons --src './test/svg_files' --dest './test/dest' --prefix hr
*/
const path = require('path');
const Svgo = require('svgo');
const svgoConfig = require('./svgo.config');
const {
  readFilesFromDirectory,
  readFile,
  writeFile,
  ensureDirectoryExistence,
  generateFileName,
  generateClassName,
  generateCustomElementName,
  mergeConfig,
  logSuccess,
  logError,
} = require('./utils');
const generate = require('./template');
const args = require('./args');

const {
  src,
  dest,
  svgoConfig: svgoConfigPath,
  prefix,
} = args;
let svgoInstance;

async function generateFile(options) {
  const {
    srcPath,
    outputPath,
  } = options;

  const rawSvg = await readFile(srcPath, 'utf8');
  const optimizedSvg = await svgoInstance.optimize(rawSvg);
  ensureDirectoryExistence(outputPath);
  await writeFile(outputPath, generate({
    ...options,
    svg: optimizedSvg.data,
  }), {
    flag: 'w',
  });
  logSuccess(`WebIcons: Successfully generated ${outputPath}`);
}

async function generateFiles() {
  const files = await readFilesFromDirectory(src);
  const svgFiles = files.filter((fileName) => path.extname(fileName) === '.svg');

  if (!svgFiles.length) {
    logError('There are no svg files in the given source directory');
  }

  svgFiles.forEach(async (fileName) => {
    const srcPath = path.resolve(src, fileName);
    const outputFileName = generateFileName(fileName, { prefix });
    const customElementName = generateCustomElementName(fileName, { prefix });
    const className = generateClassName(fileName, { prefix });

    const outputPath = path.resolve(dest, `${outputFileName}.js`);
    const options = {
      srcPath,
      outputPath,
      className,
      customElementName,
    };
    await generateFile(options);
  });
}

(async () => {
  try {
    logSuccess('WebIcons: Generating WebComponents from svgs');
    let externalConfig = {};
    if (svgoConfigPath) {
      const svgoConfigString = await readFile(svgoConfigPath, 'utf8');
      externalConfig = JSON.parse(svgoConfigString);
    }
    svgoInstance = new Svgo(mergeConfig(svgoConfig, externalConfig));

    await generateFiles();
  } catch (error) {
    logError(error);
  }
})();
