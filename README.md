# @nfjs/back-openapi

**ОГЛАВЛЕНИЕ**
- [Используемые понятия](#Используемые-понятия)
- [Принцип работы](#Принцип-работы)
- [Конфигурация](#Конфигурация)

### Используемые понятия
`Документ` - сформированное описание доступных роутов бэкенда в формате [openapi](https://swagger.io/specification/)
`Swagger` - визуальное представление документа в браузере, размещенной с помощью библиотеки [swagger-ui-dist](https://www.npmjs.com/package/swagger-ui-dist)
`jsdoc` - [формат](https://jsdoc.app/) описания комментариев для javascript
### Назначение
Модуль позволяет при старте приложения собрать openapi документ по yaml файлам и jsdoc комментариям
в подключенных приложением модулях и запустить swagger на основе этого документа по указанному в конфигурации пути.
### Принцип работы
Сначала происходит поиск всех файлов предположительно содержащих нужное описание. Это
* yaml файлы, в которых могут быть куски общего документа. Содержание их должно начинать от корневых понятий [спецификации](https://swagger.io/specification/), чаще всего `paths`,`components` 
* файлы, в которых присутствуют `jsdoc` комментарии с тегами **@typedef** и **@openapi**. Примеры приведены ниже.
* файлы с моделями, отнаследованными от **@nfjs/back-dbfw/model**
Для каждого типа можно задать паттерн для поиска относительно корня приложения и только в подключенных модулях приложения в конфигурации инструмента.
Структуры yaml из файлов и извлечённые из комментариев **@openapi** приводятся к объектам javascript-а и объединяются слиянием в результирующий документ. Проводится поиск всех $ref ссылок вида '#/components/schemas/ИмяСхемы'
и отсутствующие еще в документе ищутся среди приведенных к формату json-schema типов из комментариев **@typedef** и моделей бэкенда.
Готовый документ, `swagger` по этому документу и ошибки возникшие в процессе сбора в зависимости от конфигурации назначается на роуты бэкенда.

* Пример **@openapi** комментария
```js
/**
 * @openapi
 * paths:
 *   /r2:
 *     post:
 *       summary: post r2
 *       description: post r2
 *       requestBody:
 *         $ref: '#/components/requestBodies/r2'
 *       responses:
 *         default:
 *           $ref: '#/components/responses/r2'
 * components:
 *   responses:
 *     r2:
 *       description: response r2
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uid:
 *                 type: string
 *                 format: uuid
 *   requestBodies:
 *     r1:
 *       description: body r1
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Dto2'
 */
```
Пример **@typedef** комментария с поддерживаемыми вариантами описания
```js
/**
 * Тип
 * @typedef {Object} Typ
 * @property {string} prim Примитив
 * @property {Array<string>} arrPrim1 Массив примитивов вариант 1
 * @property {string[]} arrPrim2 Массив примитивов вариант2
 * @property {Object} obj Объект с отдельными свойствами
 * @property {string} obj.prim Свойство объекта
 * @property {{str: string, num: number}} inlineObj Объект сразу с описанием
 * @property {string} [optional] Необязательное для наличия в типе свойство
 * @property {string|Object} multi Вариативный тип
 * @property {1|2|3} numEnum Числовое перечисление
 * @property {'a'|'b'|'ab'} strEnum Строковое перечисление
 * @property {AnotherTyp} atype Тип описанный в отдельном @typedef 
 * @property {Array<AnotherTyp>} arrAtype Массив типа описанного в отдельном @typedef, возможен также AnotherTyp[]
 */
```
Дополнительные json-schema атрибуты свойств объектов задаются в формате:  {ИмяСвойства} ИмяАтрибута ЗначениеАтрибута
```js
/**
 * @typedef {Object} DataObj
 * @property {string} dat
 * @propertyOpenapi {dat} format date
 * @propertyOpenapi {dat} example 01.01.1990
 */
```
Если необходимо внести изменения в подговленный документ, то в nf-module.js модуля примерно следующее:
```js
import { container } from "@nfjs/core";
const meta = { require: { after: ['@nfjs/back-openapi'] } };
async function init() {
    const doc = container['openapi-doc'];
    doc.info.title = 'Новый заголовок';
}
```

### Конфигурация
|Свойство|Тип|Назначение|Значение по умолчанию|
|---|---|---|---|
|`denySwagger`|boolean|Отключить автоматический сбор openapi документа|false|
|`denyRouteErrors`|boolean|Отключить доступ к ошибкам при автоматическом сборе openapi документа|false|
|`route`|String|Относительный адрес, на котором будут доступны swagger, сам документ и ошибки сбора|/@nfjs/back-openapi|
|`gather`|Object|Настройки для сборщика подходящих файлов||
|`.yamlPathPattern`|String|Паттерн для поиска yaml файлов|**/\*.yaml|
|`.jsdocPathPattern`|String|файлов с jsdoc комментариями|**/\*.js|
|`.modelPathPattern`|String|моделей бэкенда **@nfjs/back-dbfw/model**|models/index.js|