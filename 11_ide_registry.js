/* ===============================
   FILE: 11_ide_registry.js
   IDE Registry
   Phase 1 Core
=============================== */

let ideRegistry =
  Object.create(null);

/* ===============================
   Register IDE Component
=============================== */

function registerIdeComponent(
  component
) {

  if (
    !component ||
    typeof component !== "object"
  ) {
    return false;
  }

  const id =
    String(
      component.id || ""
    ).trim();

  if (!id) {
    return false;
  }

  ideRegistry[id] = {

    id,

    title:
      String(
        component.title || ""
      ),

    version:
      String(
        component.version || "1.0"
      ),

    status:
      String(
        component.status ||
        "Planned"
      ),

    ready:
      Boolean(
        component.ready
      ),

    progress:
      Number(
        component.progress || 0
      ),

    health:
      Number(
        component.health || 0
      ),

    launcher:
      String(
        component.launcher || ""
      ),

    validator:
      String(
        component.validator || ""
      ),

    category:
      String(
        component.category ||
        "IDE"
      )

  };

  return true;

}

/* ===============================
   Unregister IDE Component
=============================== */

function unregisterIdeComponent(
  id
) {

  const componentId =
    String(id || "")
      .trim();

  if (
    !componentId ||
    !ideRegistry[
      componentId
    ]
  ) {
    return false;
  }

  delete ideRegistry[
    componentId
  ];

  return true;

}

