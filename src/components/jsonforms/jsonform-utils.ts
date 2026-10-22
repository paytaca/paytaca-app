export type Type = 'string' | 'number' | 'integer' | 'boolean' | 'object' | 'array';

export interface SchemaOpts {
  type?: Type | 'object'
  properties?: Record<string, SchemaOpts>
  items?: SchemaOpts
  enum?: string[]
  required?: string[]
  title?: string
}

export interface UnserializedSchemaOpts {
  type?: Type | 'object'
  enum?: string[]
  required?: boolean
  properties?: UnserializedSchemaField[]
}

export interface UnserializedSchemaField {
  _index: number
  name: string
  required: boolean
  options: UnserializedSchemaOpts
}

export type UISchemaType = 'VerticalLayout' | 'HorizontalLayout' | 'Group' | 'Control'

export interface UISchemaElement {
  type: UISchemaType
  elements?: UISchemaElement[]
  scope?: string
  label?: string
}

let createFieldCounter = 0

export function createUnserializedSchemaField(data: { name?: string, required?: boolean, options?: UnserializedSchemaOpts }): UnserializedSchemaField {
  const options = data?.options
  return {
    _index: createFieldCounter++,
    name: data?.name || '',
    required: Boolean(data?.required),
    options: {
      type: options?.type,
      required: options?.required,
      enum: options?.enum,
      properties: (Array.isArray(options?.properties) ? options?.properties : []).map(createUnserializedSchemaField),
    } as UnserializedSchemaOpts,
  }
}

export function unserializeSchemaFields(schema: SchemaOpts, opts?: { denormalizeName?: boolean }): UnserializedSchemaField[] {
  const fields: UnserializedSchemaField[] = []
  if (!schema?.properties || typeof schema.properties !== 'object') return fields

  for (const key in schema.properties) {
    const propertySchema = schema.properties[key]
    const field: UnserializedSchemaField = {
      _index: createFieldCounter++,
      name: propertySchema?.title || key,
      required: schema.required?.includes(key) || false,
      options: Object.assign({}, propertySchema) as any,
    }
    delete (field.options as any).title

    if (field.options.type === 'object' && (field.options.properties as any)) {
      const nestedSchema: SchemaOpts = {
        type: 'object',
        properties: field.options.properties as any,
        required: (field.options.required as any) || [],
      }
      field.options.properties = unserializeSchemaFields(nestedSchema)
      delete (field.options as any).required
    }

    fields.push(field)
  }

  return fields
}

export function serializeSchemaFields(data: UnserializedSchemaField[], opts?: { normalizeNames?: boolean }): SchemaOpts {
  const response: SchemaOpts = {
    type: 'object',
    properties: {},
  }
  const required: string[] = []
  const usedNames = new Set<string>()
  if (!Array.isArray(data)) return response
  data.map(fieldData => {
    const fieldOpts = Object.assign({}, fieldData.options)
    const parsedName = toSnakeCase(fieldData.name)
    let uniqueName = parsedName
    let suffix = 2
    while (usedNames.has(uniqueName)) {
      uniqueName = `${parsedName}_${suffix}`
      suffix++
    }
    usedNames.add(uniqueName)

    if (fieldData?.required) required.push(uniqueName)
    if (fieldOpts && (!Array.isArray(fieldOpts?.enum) || !fieldOpts?.enum?.length)) {
      delete fieldOpts.enum
    }
    if (fieldOpts?.type === 'object') {
      const serializedProperties = serializeSchemaFields(fieldOpts.properties as UnserializedSchemaField[])
      ;(fieldOpts as any).properties = serializedProperties?.properties
    } else {
      delete (fieldOpts as any)?.properties
    }
    ;(fieldOpts as any).title = fieldData.name
    if (response.properties) {
      response.properties[uniqueName] = fieldOpts as any
    }
  })

  if (required?.length) response.required = required

  return response
}

export function toSnakeCase(value = ''): string {
  return value
    .trim()
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toLowerCase()
}

export function fromSnakeCase(value = ''): string {
  return value
    .trim()
    .split('_')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function findDuplicateFields(fields: string[]) {
  const indexMap = new Map<string, number[]>();

  fields.forEach((field, index) => {
    const indices = indexMap.get(field);

    if (indices) {
      indices.push(index);
    } else {
      indexMap.set(field, [index]);
    }
  });

  return [...indexMap.entries()]
    .filter(([, indices]) => indices.length > 1)
    .map(([field, indices]) => ({
      field,
      indices,
    }));
}

export function schemaToUISchema(schema: SchemaOpts, opts?: { basePath?: string }): UISchemaElement {
  const uischema: UISchemaElement = {
    type: 'VerticalLayout',
    elements: [],
  }

  const properties = schema?.properties
  if (!properties) return uischema

  const basePath = (opts?.basePath || '#') + '/properties'
  for (const key in properties) {
    const propertyPath = `${basePath}/${key}`
    const obj = properties[key]
    if (obj?.type === 'object') {
      const nestedObjectSchema = schemaToUISchema(obj, { basePath: propertyPath })
      nestedObjectSchema.type = 'Group'
      nestedObjectSchema.label = fromSnakeCase(key)
      uischema.elements?.push(nestedObjectSchema)
    } else if (['string', 'number', 'integer', 'boolean'].includes(obj?.type as string)) {
      uischema.elements?.push({ type: 'Control', scope: propertyPath })
    }
  }

  return uischema
}

export function inferSchemaFromData(data: Record<string, any>): SchemaOpts {
  if (!data || typeof data !== 'object') {
    return { type: 'object', properties: {} }
  }

  const properties: Record<string, SchemaOpts> = {}
  const required: string[] = []

  for (const key in data) {
    const value = data[key]
    if (value === null || value === undefined) {
      properties[key] = { type: 'string' }
    } else if (typeof value === 'string') {
      properties[key] = { type: 'string' }
    } else if (typeof value === 'number') {
      properties[key] = { type: Number.isInteger(value) ? 'integer' : 'number' }
    } else if (typeof value === 'boolean') {
      properties[key] = { type: 'boolean' }
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        const first = value[0]
        if (typeof first === 'object' && first !== null) {
          properties[key] = {
            type: 'array',
            items: inferSchemaFromData(first),
          }
        } else {
          properties[key] = {
            type: 'array',
            items: { type: typeof first === 'string' ? 'string' : typeof first === 'number' ? 'number' : 'string' },
          }
        }
      } else {
        properties[key] = { type: 'array', items: { type: 'string' } }
      }
    } else if (typeof value === 'object') {
      properties[key] = inferSchemaFromData(value)
    } else {
      properties[key] = { type: 'string' }
    }
    required.push(key)
  }

  return { type: 'object', properties, required }
}
