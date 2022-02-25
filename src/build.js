import { load } from 'js-yaml';
import { parse } from 'comment-parser';

import { mergeToObject } from './mergeToObject.js';
import { typedefToSchema } from './typedefToSchema.js';

const mainProps = [
    'servers',
    'paths',
    'components',
    'security',
    'tags'
];
const componentsProps = [
    'schemas',
    'responses',
    'parameters',
    'examples',
    'requestBodies',
    'headers',
    'securitySchemes',
    'links',
    'callbacks'
]

/**
 * Поиск всех типов рекурсивно в объекте, указанных через '$ref' свойства
 * @param {Object} a исходный объект
 * @param {string[]} res массив найденных
 */
function findRefValues(a, res = []) {
    Object.keys(a || {}).forEach(key => {
        if (key === '$ref') {
            const type = a[key].replace('#/components/schemas/','');
            if (type && type !== a[key] && res.indexOf(type) === -1) res.push(type);
            return;
        }
        if (Array.isArray(a[key])) {
            a[key].forEach(arrElem => findRefValues(arrElem, res));
            return;
        }
        if (typeof a[key] === 'object') {
            findRefValues(a[key], res);
        }
    })
}

/**
 * @typedef NfBackOpenapiBuildError
 * @property {string} type Категория ошибки yaml|jsdoc|jsdoc-yaml|jsdoc-typedef|$ref
 * @property {*} [source] Для почти всех категорий, источник при обработке которого возникла ошибка
 * @property {string} error Текст ошибки
 */

/**
 * @typedef NfBackOpenapiBuildResult
 * @property {Object} doc Построенный документ openapi
 * @property {NfBackOpenapiBuildError[]} errors Перечень возникших при построении ошибок
 */

/**
 * @typedef NfBackOpenapiBuildComponents
 * @property {string[]} yaml Содержимое файлов с кусками общего документа openapi в виде yaml
 * @property {string[]} jsdoc Комментарии в формате jsdoc, в которых находятся описания типов или косков документа в формате yaml
 * @property {Object} model Классы всех необходимых моделей бэкенда. Ключи верхненого уровня - имена моделей
 */

/**
 * Построение документа из запчастей
 * @param {NfBackOpenapiBuildComponents} data Запчасти будущего документа, собранные по приложению
 * @returns {NfBackOpenapiBuildResult}
 */
function build(data) {
    const {yaml, jsdoc, model} = data;
    const errors = [];
    const types = {};
    const yamlParts = [];
    // 1. yaml части должны начинаться от корневых определений
    yaml.forEach(y => {
        try {
            const parsed = load(y);
            yamlParts.push(parsed);
        } catch(e) {
            errors.push({type: 'yaml', source: y, error: e});
        }
    });
    // 2. jsdoc комментарии
    jsdoc.forEach(r => {
        const parsed = parse(r, {spacing: 'preserve'});
        for (const parsedOne of parsed) {
            if (parsedOne.problems && parsedOne.problems.length > 0) {
                errors.push({type: 'jsdoc', source: r, error: parsedOne.problems})
            } else {
                for (const tag of parsedOne.tags) {
                    // 2.1. выделение @openapi комментариев, в которых будут части (чаще всего это уже роуты) в формате yaml
                    if (tag.tag === 'openapi') {
                        try {
                            const yamlPart = load(tag.description);
                            if (typeof yamlPart === 'object' && !!yamlPart) {
                                yamlParts.push(yamlPart);
                            } else {
                                errors.push({type: 'jsdoc-yaml', source: r, error: `parsed result must be [Object], got [typeof yamlPart]`});
                            }
                        } catch(e) {
                            errors.push({type: 'jsdoc-yaml', source: r, error: e})
                        }
                    }
                    // 2.2. выделение @typedef и приведение к json-схеме для блока schemas документа и оставить только используемые
                    if (tag.tag === 'typedef') {
                        try {
                            const typeName = tag.name;
                            const type = typedefToSchema(parsedOne);
                            types[typeName] = type;
                        } catch(e) {
                            errors.push({type: 'jsdoc-typedef', source: r, error: e})
                        }
                    }
                }
            }
        }
    });

    // 3. Обработка и очистка yaml
    yamlParts.forEach(y => {
        Object.keys(y).forEach(key => {
            if (mainProps.indexOf(key) === -1) delete y[key];
        });
        Object.keys(y.components || {}).forEach(key => {
            if (componentsProps.indexOf(key) === -1) delete y.components[key];
        });
    });

    const doc = {
        openapi: '3.0.0',
        info: {
            title: 'nfjs-back-openapi',
            version: '1.0.0'
        }
    };
    // 4. Слияние в документ
    yamlParts.forEach(dp => {
        mergeToObject(doc, dp);
    });

    // 4. Поиск всех недостающих типов в схеме и вставка из всех полученных из описаний @typedef и моделей бэкенда
    // т.к. при вставке нового типа, тот ожет ссылаться на другой еще включенный в документ тип, то повторяем пока таких
    // не останется
    let refRecursiveReveal = true;
    const notFindTypes = [];
    do {
        const existTypes = Object.keys(doc?.components?.schemas ?? {});
        let needTypes = [];
        findRefValues(doc, needTypes);
        needTypes = needTypes.filter(t => (existTypes.indexOf(t) === -1) && notFindTypes.indexOf(t) === -1);
        if (needTypes.length === 0) refRecursiveReveal = false;
        needTypes.forEach(nt => {
            if (!doc?.components) doc.components = {};
            if (!doc.components?.schemas) doc.components.schemas = {};
            if (nt in types) {
                doc.components.schemas[nt] = types[nt];
            } else if (nt in model) {
                doc.components.schemas[nt] = model[nt];
            } else {
                notFindTypes.push(nt);
                errors.push({type: '$ref', error: `type ${nt} not-found`});
            }
        })
    } while (refRecursiveReveal)

    return { doc, errors }
}

export {
    build,
}