interface GraphQlArgs {
    input: object;
    id: string;
  }
  
  type ColumnArgs = {
    input: {
      type: string;
    };
    id: string;
  };
  
  type BlockName = {
    kind:string;
    name:BlockValue;
  }
  
  type BlockValue = {
    kind:string;
    value:string;
  }
  
  type Argument = {
    kind:string;
    name:BlockValue;
    value:BlockName;
  }
  
  type Field = {
    kind:string;
    name:BlockValue;
    arguments:[Argument];
    selectionSet?: {
      kind:string;
      selections:[Field];
    }
  }
  
  type GraphQlInfo = {
    fieldNodes: [Field];
  }
  
  type QueryInfo = {
    schema: string;
    alias: string;
    target: string;
    fields?: object;
    links?: QueryInfo[];
    where?: object;
    limit?: number;
  };
  
  type Column = {
    id: string;
    name: string;
    dname: string;
    type: string;
    is_many?: boolean;
    required?: boolean;
    no_modify?: boolean;
  }
  
  type Table = {
    id: string;
    schema: string;
    columns: [Column]
  }
  
  const OperationMap = new Map([
    ["ne", "not"],
    ["eq", "equals"],
    ["gt", "gt"],
    ["ge", "gte"],
    ["lt", "lt"],
    ["le", "lte"],
    ["in", "in"],
    ["nin", "notIn"],
    ["ct", "contains"],
    ["sw", "startsWith"],
    ["ew", "endsWith"],
    ["and", "AND"],
    ["not", "NOT"],
    ["or", "OR"]
  ]);
  
  const parseArguments = function(args:[Argument], variables:object) {
    function parseVariable(value:any) {
        if (typeof(value) == 'object') {
            if (value.constructor == Object) {
                return Object.fromEntries(
                    Object.entries(value).map( ([key, val]) => [
                        OperationMap.get(key) || key ,
                        parseVariable(val)
                    ])
                )
            } else if( value.constructor == Array) {
                return value.map( (val) => parseVariable(val))
            }
        } else {
            return value
        }
    };
  
    function parseValue(value) {
        if (value.kind == "Variable") {
            return parseVariable(variables[value.name.value])
        }
    };
    return Object.fromEntries( args.map( (arg) => [ arg.name.value, parseValue(arg.value)]));
  }
  
  class Build_GraphQl {
      private typeDefType = new Map([
          [ "0", "ID"],
          [ "1", "Int"],
          [ "2", "Float"],
          [ "3", "String"],
          [ "4", "Boolean"],
          [ "5", "Date"]
      ]);
  
      private tables;
      private sendAndListenQueue;
      private initTypeDefs:string = `
          scalar Date
  
          type Modify {
              id: String
              createdAt: Date
              updatedAt: Date
          }
  
          input ModelNumberInput {
            ne: Int
            eq: Int
            le: Int
            lt: Int
            ge: Int
            gt: Int
            in: [Int]
            nin: [Int]
            and: [ModelNumberInput]
            or: [ModelNumberInput]
          }
  
          input ModelFloatInput {
            ne: Float
            eq: Float
            le: Float
            lt: Float
            ge: Float
            gt: Float
            in: [Float]
            nin: [Float]
            and: [ModelFloatInput]
            or: [ModelFloatInput]
          }
  
          input ModelStringInput {
            ne: String
            eq: String
            in: [String]
            nin: [String]
            and: [ModelStringInput]
            or: [ModelStringInput]
          }
  
          input ModelBooleanInput {
            ne: Boolean
            eq: Boolean
            in: [Boolean]
            nin: [Boolean]
          }
  
          input ModelDateInput {
            ne: Date
            eq: Date
            le: Date
            lt: Date
            ge: Date
            gt: Date
            in: [Date]
            nin: [Date]
            and: [ModelDateInput]
            or: [ModelDateInput]
          }
  
          input ModelListStringInput {
            equals: [String]
            has: String
            hasEvery: [String]                                                               
            hasSome: [String]
            isEmpty: Boolean
          }
      `;
      
      constructor (tables) {
        this.tables = new Map( tables.filter( ({columns}) => columns.length > 0 ).map( x => [x.id, x]))
      }
  
      public setQueue( func: Function) {
        this.sendAndListenQueue = func
      };
  
      public generateTypeDefs() {
          return [ this.initTypeDefs, ...[ ...this.tables.values()].map( ({ id, columns, column}) => {
            return ( column 
          ? `
          type ${id} {
            id: String
            createdAt: Date
            updatedAt: Date
            ${ columns.map( ({ id, type, required, is_many}) => `${id}: ${is_many ? "[" : ""}${this.typeDefType.has(type) ? this.typeDefType.get(type) : type}${is_many ? "]" : ""}${required ? "!" : ""}`).join("\n\t")}
        }`
          : `
      type ${id} {
          id: String
          createdAt: Date
          updatedAt: Date
          ${ columns.map( ({ id, type, required, is_many}) => `${id}: ${is_many ? "[" : ""}${this.typeDefType.has(type) ? this.typeDefType.get(type) : type}${is_many ? "]" : ""}${required ? "!" : ""}`).join("\n\t")}
      }
  
      type ${id}Watch {
          id: String
          createdAt: Date
          updatedAt: Date
          ${ columns.filter( x => !x.relations).map( ({ id, type, required, is_many}) => `${id}: ${is_many ? "[" : ""}${this.typeDefType.has(type) ? this.typeDefType.get(type) : type}${is_many ? "]" : ""}${required ? "!" : ""}`).join("\n\t")}
      }
  
      input ${id}WhereInput {
          id: ModelStringInput
          createdAt: ModelDateInput
          updatedAt: ModelDateInput
          ${ columns.filter( x => ![ ...x.relations || []].length).map( ({ id, type, required, is_many}) => `${id}: Model${is_many ? "List" : ""}${this.typeDefType.has(type) ? this.typeDefType.get(type) : type}Input`).join("\n\t")}
      }
  
      input ${id}CreateInput {
          ${ columns.filter( x => [ ...(x.relations || [])].length == 0).map( ({ id, type, required, is_many}) => `${id}: ${ is_many ? "[" : ""}${this.typeDefType.has(type) ? this.typeDefType.get(type) : type}${is_many ? "]" : ""}${required ? "!" : ""}`).join("\n\t")}
      }
      
      input ${id}UpdateInput {
          ${ columns.filter( x => !x.no_modify && [ ...(x.relations || [])].length == 0).map( ({ id, type, required, is_many}) => `${id}: ${is_many ? "[" : ""}${this.typeDefType.has(type) ? this.typeDefType.get(type) : type}${is_many ? "]" : ""}${required ? "!" : ""}`).join("\n\t")}
      }
      
      type Query {
        get_${id} (id: ID!): ${id}!
        list_${id} (where: ${id}WhereInput!): [${id}]!
        watch_${id} (where: ${id}WhereInput!): ${id}Watch!
      }
  
      type Mutation {
        create_${id} (input: ${id}CreateInput!): Modify!
        update_${id} (input: ${id}UpdateInput!, id: ID!): Modify!
      }
      `)})].join("\n")
      };
  
      protected convertGraph = function ( field:Field, table:Table, args:object = {}, variables: object = {}, child = false):QueryInfo {
        return {
            schema: "dudu-private",
            alias: field.name.value,
            ...( parseArguments(field.arguments, variables)),
            target: child ? field.name.value : table.id,
            fields: field.selectionSet?.selections.filter( _field => !_field.selectionSet).map( _field => _field.name.value),
            links: field.selectionSet?.selections.filter( _field => _field.selectionSet).map( _field => this.convertGraph(_field, this.tables.get(table.columns.filter( col => col.id == _field.name.value)[0].type), args, variables, true))
        };
      }
  
      public generateResolves() {
        const tables = this.tables;
        // function combineTable(table_id:string, level = 0) {
        //    let current_table = tables.get(table_id) || { columns: []};
        //    if (level == 0) {
        //     current_table.columns = current_table.columns.map( (col) => {
        //      if (col.relations) {
        //        col.columns = combineTable(col["id"], level + 1)["columns"];
        //        return col
        //      } else { return col}
        //     });
        //    }
        //    return current_table;
        // };
  
        let all_action:Array<Array<any>> = [];
        [ ...this.tables].map( ([key, val]) => val).filter( ({column}) => !column).forEach( ({ id, columns}) => {
          all_action = [...all_action, ...[
            [ "query", "get"],
            [ "query", "list"],
            [ "mutation", "create"],
            [ "mutation", "update"]
          ].map( ([type, action]) => ([
            type, action + "_"+ id, async (parentValue:any, args:object, context:object, info:GraphQlInfo) => {
              try {
                let query = this.convertGraph(info.fieldNodes[0], this.tables.get(id), args, info["variableValues"]);
                console.log(query.links)
                return await this.sendAndListenQueue(action, query)
              } catch (err) { console.error(err)}
            }
          ]))]
        });
  
        return ({
          Query: Object.fromEntries( all_action.filter( ([type, name, func]) => type == "query").map( ([type, name, func]) => [ name, func])),
          Mutation: Object.fromEntries( all_action.filter( ([type, name,func]) => type == "mutation").map( ([type, name, func]) => [ name, func]))
        })
      };
  }
  
  export default Build_GraphQl
  