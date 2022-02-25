import { extension } from "@nfjs/core";
import { readFile } from "fs/promises";
import url from "url";

/**
 * Сбор файлов по проекту из которых будет формироваться функцией build схема openapi
 * @param {Object} options Опции выполнения
 * @param {string} options.yamlPathPattern Паттерн для поиска файлов с описанием в виде yaml
 * @param {string} options.jsdocPathPattern Паттерн для поиска файлов, из окоторых нужно собирать jsdoc комментарии
 * @param {string} options.modelPathPattern Паттерн для поиска корневых index.js из папок с моделями бэкенда
 * @returns {Promise<NfBackOpenapiBuildComponents>}
 */
export async function gather(options= {}) {
    const {
        yamlPathPattern = '**/*.yaml',
        jsdocPathPattern = '**/*.js',
        modelPathPattern = 'models/index.js',
    } = options;
    // собрать все файлы из подключенных экстеншенов
    // 1. yaml, yml файлы в которых могут находиться части общего документа. Эти части должны начинаться от корневых определений
    const yamlFilePaths = await extension.getFiles(yamlPathPattern, {resArray: true, onlyExt: true});
    const yamlFiles = await Promise.all(yamlFilePaths.map(f => readFile(f, 'utf8')));
    // 2. js файлы c jsdoc комментариями
    const jsdocFilePaths = await extension.getFiles(jsdocPathPattern, {resArray: true, onlyExt: true});
    const jsdocRegex = /\/\*\*([\s\S]*?)\*\//gm;
    const jsdoc = [];
    for (const jsdocFilePath of jsdocFilePaths) {
        const jsdocFile = await readFile(jsdocFilePath, 'utf8');
        const reg = jsdocFile.match(jsdocRegex);
        if (reg) jsdoc.push(...reg);
    }
    // 3. js файлы с моделями
    const models = {};
    const modelsFiles = await extension.getFiles(modelPathPattern, {resArray: true, onlyExt: true});
    for (const modelsFile of modelsFiles) {
        const urlFile = url.pathToFileURL(modelsFile).toString();
        const _models = await import(urlFile);
        Object.keys(_models).forEach(sch => {
            Object.keys(_models[sch]).forEach(model => {
                models[model] = _models[sch][model]._schema;
            })
        })
    }
    return { yaml: yamlFiles, jsdoc, model: models }
}

