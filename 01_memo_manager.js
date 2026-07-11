/* ===============================
   FILE: 01_memo_manager.js
=============================== */

function isMemoLocked(memo) {

  if (!memo) {
    return true;
  }

  return (
    memo.locked === true ||
    memo.migrationLocked === true
  );

}

/* ===============================
   Memo Update
=============================== */

function updateMemo(
  index,
  data = {}
) {

  if (
    !Array.isArray(memoBoxList)
  ) {
    return false;
  }

  if (
    index < 0 ||
    index >= memoBoxList.length
  ) {
    return false;
  }

  const memo =
    memoBoxList[index];

  if (
    isMemoLocked(memo)
  ) {
    console.warn(
      "This memo is locked."
    );
    return false;
  }

  memoBoxList[index] = {

    ...memo,

    ...data,

    updatedAt:
      new Date().toISOString()

  };

  return true;

}

/* ===============================
   Memo Delete
=============================== */

function deleteMemo(index) {

  if (
    !Array.isArray(memoBoxList)
  ) {
    return false;
  }

  if (
    index < 0 ||
    index >= memoBoxList.length
  ) {
    return false;
  }

  if (
    isMemoLocked(
      memoBoxList[index]
    )
  ) {
    console.warn(
      "This memo is locked."
    );
    return false;
  }

  memoBoxList.splice(
    index,
    1
  );

  return true;

}

/* ===============================
   Memo Create
=============================== */

function createMemo(
  memo = {}
) {

  if (
    !Array.isArray(memoBoxList)
  ) {
    return -1;
  }

  memoBoxList.unshift({

    ...memo,

    createdAt:
      memo.createdAt ||
      new Date().toISOString(),

    updatedAt:
      new Date().toISOString()

  });

  return 0;

}

window.isMemoLocked =
  isMemoLocked;

window.updateMemo =
  updateMemo;

window.deleteMemo =
  deleteMemo;

window.createMemo =
  createMemo;
