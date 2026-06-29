/* ===============================
   Architecture Repository
   Repository v1
   Read Only Layer
=============================== */

/* ===============================
   Get Architecture Database
=============================== */

function getArchitectureDatabase() {

  if (
    typeof architectureDatabase !== "undefined" &&
    architectureDatabase
  ) {
    return architectureDatabase;
  }

  if (
    window.architectureDatabase
  ) {
    return window.architectureDatabase;
  }

  return {
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
   Repository Match Utility
=============================== */

function matchArchitectureValue(
  actual,
  expected
) {

  if (!expected) {
    return true;
  }

  return String(actual || "")
    .toLowerCase() ===
    String(expected || "")
      .toLowerCase();

}

function matchArchitectureTags(
  tags,
  expected
) {

  if (!expected) {
    return true;
  }

  if (!Array.isArray(tags)) {
    return false;
  }

  return tags.some(tag =>
    String(tag || "")
      .toLowerCase() ===
    String(expected || "")
      .toLowerCase()
  );

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
      !matchArchitectureValue(
        object.type,
        filter.type
      )
    ) {
      return false;
    }

    if (
      !matchArchitectureValue(
        object.category,
        filter.category
      )
    ) {
      return false;
    }

    if (
      !matchArchitectureValue(
        object.layer,
        filter.layer
      )
    ) {
      return false;
    }

    if (
      !matchArchitectureValue(
        object.status,
        filter.status
      )
    ) {
      return false;
    }

    if (
      !matchArchitectureValue(
        object.priority,
        filter.priority
      )
    ) {
      return false;
    }

    if (
      !matchArchitectureTags(
        object.tags,
        filter.tag
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
        !matchArchitectureValue(
          relationship.source,
          filter.source
        )
      ) {
        return false;
      }

      if (
        !matchArchitectureValue(
          relationship.target,
          filter.target
        )
      ) {
        return false;
      }

      if (
        !matchArchitectureValue(
          relationship.type,
          filter.type
        )
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

window.matchArchitectureValue =
  matchArchitectureValue;

window.matchArchitectureTags =
  matchArchitectureTags;

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