import { capitalize } from "vue"

/**
 * @typedef {Object} SchemaOpts
 * @property {'string' | 'number' | 'boolean' | 'object' } type
 * @property {Map<String, SchemaOpts>} properties
 * @property {String[]} enum
 * @property {String[]} [required]
 * 
 * @typedef {Object} UnserializedSchemaOpts
 * @property {'string' | 'number' | 'boolean' | 'object'} type
 * @property {String[]} [type.enum]
 * @property {Boolean} [type.required]
 * @property {{ name:String, options:UnserializedSchemaOpts }[]} [type.properties]
 * 
 * @typedef {Object} UnserializedSchemaField
 * @property {String} name
 * @property {Boolean} required
 * @property {UnserializedSchemaOpts} options
*/

/**
 * @param {SchemaOpts} schema 
 * @param {Object} opts
 * @param {String} [opts.basePath]
 */
export function schemaToUISchema(schema, opts) {
  const uischema = {
    type: 'VerticalLayout',
    elements: [],
  }

  const basePath = (opts?.basePath || '#') + '/properties'
  for (const key in schema?.properties) {
    const propertyPath = `${basePath}/${key}`
    const obj = schema?.properties?.[key]
    if (obj?.type === 'object') {
      const nestedObjectSchema = schemaToUISchema(obj, { basePath: propertyPath })
      nestedObjectSchema.type = 'Group'
      nestedObjectSchema.label = capitalize(key).replace('_', ' ')
      uischema.elements.push(nestedObjectSchema)
    } else if (['string', 'number', 'boolean'].includes(obj?.type)) {
      uischema.elements.push({ type: 'Control', scope: propertyPath })
    }
  }

  return uischema
}


let createFieldCounter = 0
/**
 * 
 * @param {Object} data
 * @param {String} data.name
 * @param {UnserializedSchemaOpts} data.options
 * @returns {UnserializedSchemaField}
 */
export function createUnserializedSchemaField(data) {
  const options = data?.options
  return {
    _index: createFieldCounter++,
    name: data?.name,
    required: Boolean(data?.required),
    options: {
      type: options?.type,
      required: options?.required,
      enum: options?.enum,
      properties: (Array.isArray(options?.properties) ? options?.properties : []).map(createUnserializedSchemaField),
    },
  }
}

/**
 * @param {UnserializedSchemaField[]} data 
 * @returns {SchemaOpts}
 */
export function serializeSchemaFields(data) {
  const response = {
    type: 'object',
    properties: {},
  }
  const required = []
  if (!Array.isArray(data)) return response
  data.map(fieldData => {
    const fieldOpts = Object.assign({}, fieldData.options)
    if (fieldData?.required) required.push(fieldData?.name)
    if (fieldOpts && (!Array.isArray(fieldOpts?.enum) || !fieldOpts?.enum?.length)) {
      delete fieldOpts.enum
    }
    if (fieldOpts?.type === 'object') {
      const serializedProperties = serializeSchemaFields(fieldOpts.properties)
      fieldOpts.properties = serializedProperties?.properties
    } else {
      delete fieldOpts?.properties
    }
    response.properties[fieldData.name] = fieldOpts
  })

  if (required?.length) response.required = required

  return response
}

// export const schema = {
//   type: 'object',
//   properties: {
//     firstName: { type: 'string', minLength: 1 },
//     lastName: { type: 'string', minLength: 1 },
//     age: { type: 'number', min: 0 },
//     phoneNumber: { type: 'string', minLength: 1 },
//     location: {
//       type: 'object',
//       properties: {
//         street: { type: 'string', minLength: 1 },
//         country: { type: 'string', minLength: 1 },
//       }
//     }
//   },
//   required: [ 'firstName' ],
// }

// export const uischema = {
//   type: 'VerticalLayout',
//   elements: [
//     {
//       type: 'HorizontalLayout',
//       elements: [
//         { type: 'Control', scope: '#/properties/firstName' },
//         { type: 'Control', scope: '#/properties/lastName' },
//       ]
//     },
//     { type: 'Control', scope: '#/properties/age' },
//     { type: 'Control', scope: '#/properties/phoneNumber' },
//     {
//       type: 'Group',
//       label: 'Location',
//       elements: [
//         { type: 'Control', scope: '#/properties/location/properties/country' }, 
//       ]
//     }
//   ]
// }