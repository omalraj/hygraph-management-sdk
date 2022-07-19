import { Field, FieldType } from "./field";
import {
  MutationMode,
  PartialBy,
  RelationType,
  CreateSimpleFieldArgs,
  FieldValidationArgs,
  extractFieldValidations,
} from "./util";
import { ChangeItem, ChangeListener, MigrationChange } from "./migration";
import { Renderer } from "./renderer";
import {
  GraphQLBatchMigrationCreateEnumerableFieldInput,
  GraphQLBatchMigrationCreateComponentInput,
  GraphQLBatchMigrationCreateRelationalFieldInput,
  GraphQLBatchMigrationCreateRemoteFieldInput,
  GraphQLBatchMigrationCreateReverseRelationalFieldInput,
  GraphQLBatchMigrationCreateSimpleFieldInput,
  GraphQLBatchMigrationCreateComponentUnionFieldInput,
  GraphQLBatchMigrationUpdateEnumerableFieldInput,
  GraphQLBatchMigrationUpdateComponentInput,
  GraphQLBatchMigrationUpdateRelationalFieldInput,
  GraphQLBatchMigrationUpdateRemoteFieldInput,
  GraphQLBatchMigrationUpdateSimpleFieldInput,
  GraphQLBatchMigrationUpdateComponentUnionFieldInput,
  GraphQLRelationalFieldType,
  GraphQLSimpleFieldType,
} from "./generated/schema";

type ComponentArgs =
  | GraphQLBatchMigrationCreateComponentInput
  | GraphQLBatchMigrationUpdateComponentInput;

/**
 * Relational Fields
 */
interface RelationalFieldArgs
  extends Omit<
    GraphQLBatchMigrationCreateRelationalFieldInput,
    "reverseField" | "isHidden"
  > {
  relationType: RelationType;
  model: string;
  /**
   * @deprecated Use visibility instead.
   */
  isHidden: GraphQLBatchMigrationCreateRelationalFieldInput["isHidden"];
  reverseField?: Omit<
    GraphQLBatchMigrationCreateReverseRelationalFieldInput,
    "modelApiId" | "isList" | "isHidden"
  > & {
    /**
     * @deprecated Use visibility instead.
     */
    isHidden?: GraphQLBatchMigrationCreateReverseRelationalFieldInput["isHidden"];
  };
}

/**
 * Create Union Field
 */
interface CreateUnionFieldArgs
  extends GraphQLBatchMigrationCreateComponentUnionFieldInput {
  relationType: RelationType;
  components: string[];
}

/**
 * Update Union Field
 */
interface UpdateUnionFieldArgs
  extends GraphQLBatchMigrationUpdateComponentUnionFieldInput {
  components?: string[];
}

interface UpdateSimpleFieldArgs
  extends Omit<
    GraphQLBatchMigrationUpdateSimpleFieldInput,
    "validations" | "modelApiId" | "isHidden"
  > {
  validations?: FieldValidationArgs;
  /**
   * @deprecated Use visibility instead.
   */
  isHidden?: GraphQLBatchMigrationCreateSimpleFieldInput["isHidden"];
}

interface UpdateRelationalFieldArgs
  extends Omit<
    GraphQLBatchMigrationUpdateRelationalFieldInput,
    "modelApiId" | "isHidden"
  > {
  /**
   * @deprecated Use visibility instead.
   */
  isHidden?: GraphQLBatchMigrationUpdateRelationalFieldInput["isHidden"];
}

interface CreateEnumerableFieldArgs
  extends Omit<
    GraphQLBatchMigrationCreateEnumerableFieldInput,
    "modelApiId" | "isHidden"
  > {
  /**
   * @deprecated Use visibility instead.
   */
  isHidden?: GraphQLBatchMigrationCreateEnumerableFieldInput["isHidden"];
}

interface UpdateEnumerableFieldArgs
  extends Omit<
    GraphQLBatchMigrationUpdateEnumerableFieldInput,
    "modelApiId" | "isHidden"
  > {
  /**
   * @deprecated Use visibility instead.
   */
  isHidden?: GraphQLBatchMigrationUpdateEnumerableFieldInput["isHidden"];
}

interface CreateRemoteFieldArgs
  extends Omit<GraphQLBatchMigrationCreateRemoteFieldInput, "parentApiId"> {}

interface UpdateRemoteFieldArgs
  extends Omit<GraphQLBatchMigrationUpdateRemoteFieldInput, "parentApiId"> {}

/**
 * GraphCMS Component
 */
interface Component {
  /**
   * Add a new field to the model.
   * @param field options for the field.
   */
  addSimpleField(field: CreateSimpleFieldArgs): Component;

  /**
   * Update an existing field
   * @param field options for the field.
   */
  updateSimpleField(field: UpdateSimpleFieldArgs): Component;

  /**
   * Add a relational field
   * @param field options for the relational field.
   */
  addRelationalField(
    field: Omit<
      PartialBy<RelationalFieldArgs, "reverseField" | "type">,
      "modelApiId"
    >
  ): Component;

  /**
   * Update a relational field
   * @param field options for the relational field.
   */
  updateRelationalField(field: UpdateRelationalFieldArgs): Component;

  /**
   * Add a union field
   * @param field options for the union field.
   */
  addUnionField(field: Omit<CreateUnionFieldArgs, "parentApiId">): Component;

  /**
   * Update a union field.
   * @param field options for the union field.
   */
  updateUnionField(field: Omit<UpdateUnionFieldArgs, "parentApiId">): Component;

  /**
   * Create an enumerable field.
   * @param field options for the enumerable field.
   */
  addEnumerableField(field: CreateEnumerableFieldArgs): Component;

  /**
   * Update an enumerable field
   * @param field options for the enumerable field.
   */
  updateEnumerableField(field: UpdateEnumerableFieldArgs): Component;

  /* Create an remote field.
   * @param field options for the remote field.
   */
  addRemoteField(field: CreateRemoteFieldArgs): Component;

  /**
   * Update a remote field
   * @param field options for the remote field.
   */
  updateRemoteField(field: UpdateRemoteFieldArgs): Component;

  /**
   * Delete a field
   * @param apiId the apiId of the field to delete.
   */
  deleteField(apiId: string): void;
}

/**
 * @ignore
 */
class ComponentClass implements Component, ChangeItem {
  constructor(
    private listener: ChangeListener,
    private mode: MutationMode,
    private args: ComponentArgs
  ) {}

  addSimpleField(passedFieldArgs: any): Component {
    const fieldArgs = { ...passedFieldArgs };
    fieldArgs.parentApiId = this.args.apiId;
    if (fieldArgs.type === GraphQLSimpleFieldType.String) {
      fieldArgs.formRenderer = fieldArgs.formRenderer || Renderer.SingleLine;
    }

    if (fieldArgs.validations) {
      fieldArgs.validations = extractFieldValidations(fieldArgs);
    }

    const field = new Field(fieldArgs, MutationMode.Create);
    this.listener.registerChange(field);
    return this;
  }

  updateSimpleField(passedFieldArgs: any): Component {
    const fieldArgs = { ...passedFieldArgs };
    fieldArgs.parentApiId = this.args.apiId;

    if (fieldArgs.validations) {
      fieldArgs.validations = extractFieldValidations(fieldArgs);
    }

    const { type, ...fieldChanges } = fieldArgs;
    const field = new Field(fieldChanges, MutationMode.Update);
    this.listener.registerChange(field);
    return this;
  }

  addRelationalField(passedFieldArgs: any): Component {
    const fieldArgs = { ...passedFieldArgs };
    fieldArgs.parentApiId = this.args.apiId;

    const fieldTypeUpper = fieldArgs.type?.toUpperCase();
    const fieldModelUpper = fieldArgs.model?.toUpperCase();

    if (
      fieldTypeUpper === GraphQLRelationalFieldType.Asset ||
      fieldModelUpper === GraphQLRelationalFieldType.Asset
    ) {
      fieldArgs.type = GraphQLRelationalFieldType.Asset;
    } else {
      fieldArgs.type = GraphQLRelationalFieldType.Relation;
    }

    if (!fieldArgs.reverseField) {
      fieldArgs.reverseField = {
        apiId: `related${fieldArgs.parentApiId}`,
        displayName: `Related ${fieldArgs.parentApiId}`,
      };
    }

    fieldArgs.reverseField.modelApiId = fieldArgs.model;

    fieldArgs.isList =
      fieldArgs.relationType === RelationType.OneToMany ||
      fieldArgs.relationType === RelationType.ManyToMany;
    fieldArgs.reverseField.isList =
      fieldArgs.relationType === RelationType.ManyToOne ||
      fieldArgs.relationType === RelationType.ManyToMany;

    if (fieldArgs.type === GraphQLRelationalFieldType.Asset) {
      // Asset needs the isRequired field
      if (fieldArgs.isRequired === undefined) {
        fieldArgs.isRequired = false;
      }
      // asset needs reverse field to be list
      fieldArgs.reverseField.isList = true;
      // asset needs reverse field to be hidden;
      fieldArgs.reverseField.isHidden = true;
    } else {
      // we have to drop them on relation fields:
      delete fieldArgs.isRequired;
    }

    // remove convenience fields
    delete fieldArgs.model;
    delete fieldArgs.relationType;

    const field = new Field(
      fieldArgs,
      MutationMode.Create,
      FieldType.RelationalField
    );
    this.listener.registerChange(field);
    return this;
  }

  updateRelationalField(passedFieldArgs: any): Component {
    const fieldArgs = { ...passedFieldArgs };
    fieldArgs.parentApiId = this.args.apiId;
    fieldArgs.reverseField = passedFieldArgs?.reverseField;

    if (
      fieldArgs.type?.toUpperCase() === GraphQLRelationalFieldType.Asset &&
      fieldArgs.isRequired !== undefined
    ) {
      fieldArgs.isRequired = Boolean(fieldArgs.isRequired);
    }

    const field = new Field(
      fieldArgs,
      MutationMode.Update,
      FieldType.RelationalField
    );
    this.listener.registerChange(field);
    return this;
  }

  addUnionField(passedFieldArgs: any): Component {
    const fieldArgs = { ...passedFieldArgs };
    fieldArgs.parentApiId = this.args.apiId;
    if (!fieldArgs.components || fieldArgs.components.length === 0) {
      throw new Error(`components cannot be empty`);
    }

    fieldArgs.isList =
      fieldArgs.relationType === RelationType.OneToMany ||
      fieldArgs.relationType === RelationType.ManyToMany;

    // remove convenience fields
    delete fieldArgs.relationType;

    const field = new Field(
      fieldArgs,
      MutationMode.Create,
      FieldType.UnionField
    );
    this.listener.registerChange(field);
    return this;
  }

  updateUnionField(passedFieldArgs: any): Component {
    const fieldArgs = { ...passedFieldArgs };
    fieldArgs.parentApiId = this.args.apiId;

    // remove convenience field
    delete fieldArgs.components;

    const field = new Field(
      fieldArgs,
      MutationMode.Update,
      FieldType.UnionField
    );

    this.listener.registerChange(field);
    return this;
  }

  addEnumerableField(passedFieldArgs: any): Component {
    const fieldArgs = { ...passedFieldArgs };
    if (!fieldArgs.enumerationApiId) {
      throw new Error("enumerationApiId is required for enumerable field");
    }
    fieldArgs.parentApiId = this.args.apiId;
    const field = new Field(
      fieldArgs,
      MutationMode.Create,
      FieldType.EnumerableField
    );
    this.listener.registerChange(field);
    return this;
  }

  updateEnumerableField(passedFieldArgs: any): Component {
    const fieldArgs = { ...passedFieldArgs };
    fieldArgs.parentApiId = this.args.apiId;

    const field = new Field(
      fieldArgs,
      MutationMode.Update,
      FieldType.EnumerableField
    );
    this.listener.registerChange(field);
    return this;
  }

  addRemoteField(passedFieldArgs: any): Component {
    const fieldArgs = { ...passedFieldArgs };
    fieldArgs.parentApiId = this.args.apiId;

    const field = new Field(
      fieldArgs,
      MutationMode.Create,
      FieldType.RemoteField
    );
    this.listener.registerChange(field);
    return this;
  }

  updateRemoteField(passedFieldArgs: any): Component {
    const fieldArgs = { ...passedFieldArgs };
    fieldArgs.parentApiId = this.args.apiId;

    const field = new Field(
      fieldArgs,
      MutationMode.Update,
      FieldType.RemoteField
    );
    this.listener.registerChange(field);
    return this;
  }

  deleteField(apiId: string): Component {
    const field = new Field(
      { apiId, parentApiId: this.args.apiId },
      MutationMode.Delete
    );
    this.listener.registerChange(field);
    return this;
  }

  hasChanges(): boolean {
    // all modes are guaranteed to have changes except Update.
    if (this.mode !== MutationMode.Update) {
      return true;
    }
    // apiId is always a requirement, length of 1 means its apiId only.
    return Object.keys(this.args).length > 1;
  }

  generateChange(): MigrationChange {
    let action: string;
    switch (this.mode) {
      case MutationMode.Create:
        action = "createComponent";
        break;
      case MutationMode.Update:
        action = "updateComponent";
        break;
      case MutationMode.Delete:
        action = "deleteComponent";
        break;
    }

    const change: { [key: string]: any } = {};
    change[action] = this.args;
    return change;
  }
}

export { Component, ComponentClass };
