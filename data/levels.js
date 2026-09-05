/* Static curriculum registry. Files in data/lessons populate the levels without render logic. */
(function (data) {
  data.levelOrder = ['A1','A2','B1','B2','C1','C2'];
  data.levels = data.levels || {};
  data.levelBlocks = Object.freeze({ grammar:'Grammatik & Übungen', skills:'Prüfungstrainer' });
})(window.DeutschraumData = window.DeutschraumData || {});
