/* ===============================
   FILE: 14_architecture_repository.js
   Architecture Repository
=============================== */

/* ===============================
   Get Architecture Database
=============================== */

function getArchitectureDatabase() {

  return window.architectureDatabase || {
    version: "",
    objects: {},
    relationships: [],
    indexes: {},
    statistics: {
      objectCount: 0,
      relationshipCount: 0,
      updatedAt: ""
    }
  };

}

/* ===============================
   Object Repository
=============================== */

function findArchitectureObject(
  id
) {

  const database =
    getArchitectureDatabase();

  if (!id) {
    return null;
  }

  return database.objects?.[id] || null;

}

function findArchitectureObjects(
  filter = {}
) {

  const database =
    getArchitectureDatabase();

  const objects =
    Object.values(
      database.objects || {}
    );

  return objects.filter(object => {

    if (
      filter.type &&
      object.type !== filter.type
    ) {
      return false;
    }

    if (
      filter.category &&
      object.category !== filter.category
    ) {
      return false;
    }

    if (
      filter.layer &&
      object.layer !== filter.layer
    ) {
      return false;
    }

    if (
      filter.status &&
      object.status !== filter.status
    ) {
      return false;
    }

    if (
      filter.priority &&
      object.priority !== filter.priority
    ) {
      return false;
    }

    if (
      filter.tag &&
      !(
        Array.isArray(object.tags) &&
        object.tags.includes(filter.tag)
      )
    ) {
      return false;
    }

    return true;

  });

}

function findArchitectureObjectsByType(
  type
) {

  return findArchitectureObjects({
    type
  });

}

function findArchitectureObjectsByCategory(
  category
) {

  return findArchitectureObjects({
    category
  });

}

function findArchitectureObjectsByLayer(
  layer
) {

  return findArchitectureObjects({
    layer
  });

}

function findArchitectureObjectsByTag(
  tag
) {

  return findArchitectureObjects({
    tag
  });

}

/* ===============================
   Relationship Repository
=============================== */

function getArchitectureRelationships() {

  const database =
    getArchitectureDatabase();

  const relationships =
    database.relationships || [];

  if (
    Array.isArray(relationships)
  ) {
    return relationships;
  }

  return Object.values(
    relationships
  );

}

function findArchitectureRelationships(
  filter = {}
) {

  return getArchitectureRelationships()
    .filter(relationship => {

      if (
        filter.source &&
        relationship.source !== filter.source
      ) {
        return false;
      }

      if (
        filter.target &&
        relationship.target !== filter.target
      ) {
        return false;
      }

      if (
        filter.type &&
        relationship.type !== filter.type
      ) {
        return false;
      }

      return true;

    });

}

function findArchitectureChildren(
  source
) {

  return findArchitectureRelationships({
    source
  });

}

function findArchitectureParents(
  target
) {

  return findArchitectureRelationships({
    target
  });

}

function findArchitectureCalls(
  source
) {

  return findArchitectureRelationships({
    source,
    type: "calls"
  });

}

function findArchitectureCalledBy(
  target
) {

  return findArchitectureRelationships({
    target,
    type: "calls"
  });

}

/* ===============================
   Existence / Count / Statistics
=============================== */

function existsArchitectureObject(
  id
) {

  return !!findArchitectureObject(
    id
  );

}

function countArchitectureObjects(
  filter = {}
) {

  return findArchitectureObjects(
    filter
  ).length;

}

function countArchitectureRelationships(
  filter = {}
) {

  return findArchitectureRelationships(
    filter
  ).length;

}

function getArchitectureStatistics() {

  const database =
    getArchitectureDatabase();

  return database.statistics || {
    objectCount:
      countArchitectureObjects(),

    relationshipCount:
      countArchitectureRelationships(),

    updatedAt:
      ""
  };

}

/* ===============================
   Global Export
=============================== */

window.getArchitectureDatabase =
  getArchitectureDatabase;

window.findArchitectureObject =
  findArchitectureObject;

window.findArchitectureObjects =
  findArchitectureObjects;

window.findArchitectureObjectsByType =
  findArchitectureObjectsByType;

window.findArchitectureObjectsByCategory =
  findArchitectureObjectsByCategory;

window.findArchitectureObjectsByLayer =
  findArchitectureObjectsByLayer;

window.findArchitectureObjectsByTag =
  findArchitectureObjectsByTag;

window.getArchitectureRelationships =
  getArchitectureRelationships;

window.findArchitectureRelationships =
  findArchitectureRelationships;

window.findArchitectureChildren =
  findArchitectureChildren;

window.findArchitectureParents =
  findArchitectureParents;

window.findArchitectureCalls =
  findArchitectureCalls;

window.findArchitectureCalledBy =
  findArchitectureCalledBy;

window.existsArchitectureObject =
  existsArchitectureObject;

window.countArchitectureObjects =
  countArchitectureObjects;

window.countArchitectureRelationships =
  countArchitectureRelationships;

window.getArchitectureStatistics =
  getArchitectureStatistics;