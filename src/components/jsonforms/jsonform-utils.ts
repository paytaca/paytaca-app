export type Type = 'string' | 'number' | 'integer' | 'boolean' | 'object';

export interface SchemaOpts {
  type?: Type | 'object'
  properties?: Record<string, SchemaOpts>
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
