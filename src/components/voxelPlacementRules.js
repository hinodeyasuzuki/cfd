export function isACAllowedCell(cell, dims) {
  const { nMeshX, nMeshY, nMeshZ } = dims;

  const isCeilingPosition =
    cell.y === nMeshY - 3 &&
    cell.x >= 2 && cell.x <= nMeshX - 2 &&
    cell.z >= 2 && cell.z <= nMeshZ - 2;

  return isCeilingPosition;
}

// エアコンは幅1200mm。複数ボクセルを一括配置するセルリストを生成
export function getACCellArray(baseCell, dims) {
  const { nMeshX, nMeshY, nMeshZ, unitSize } = dims;
  const acWidthMm = 1200; // mm
  const unitSizeMm = unitSize * 1000; // m to mm
  const numCells = Math.round(acWidthMm / unitSizeMm);

  const cells = [];
  
  // 壁面からの配置方向を判定（x軸またはz軸方向）
  if (baseCell.x === 2 || baseCell.x === nMeshX - 3) {
    // x軸方向の壁（左右）：z軸方向に拡張
    const centerZ = baseCell.z;
    let startZ = Math.max(2, centerZ - Math.floor(numCells / 2));
    let endZ = Math.min(startZ + numCells - 1, nMeshZ - 3);
    
    // 壁面に達した場合、逆方向に寄せる
    const actualCount = endZ - startZ + 1;
    if (actualCount < numCells) {
      // 上限に達した場合、下限から配置を調整
      if (endZ === nMeshZ - 3) {
        startZ = Math.max(2, nMeshZ - 3 - numCells + 1);
      } else if (startZ === 2) {
        endZ = Math.min(nMeshZ - 3, 2 + numCells - 1);
      }
    }
    
    for (let z = startZ; z <= endZ; z++) {
      const cell = { ...baseCell, z };
      if (isACAllowedCell(cell, dims)) {
        cells.push(cell);
      }
    }
  } else if (baseCell.z === 2 || baseCell.z === nMeshZ - 3) {
    // z軸方向の壁（前後）：x軸方向に拡張
    const centerX = baseCell.x;
    let startX = Math.max(2, centerX - Math.floor(numCells / 2));
    let endX = Math.min(startX + numCells - 1, nMeshX - 3);
    
    // 壁面に達した場合、逆方向に寄せる
    const actualCount = endX - startX + 1;
    if (actualCount < numCells) {
      // 上限に達した場合、下限から配置を調整
      if (endX === nMeshX - 3) {
        startX = Math.max(2, nMeshX - 3 - numCells + 1);
      } else if (startX === 2) {
        endX = Math.min(nMeshX - 3, 2 + numCells - 1);
      }
    }
    
    for (let x = startX; x <= endX; x++) {
      const cell = { ...baseCell, x };
      if (isACAllowedCell(cell, dims)) {
        cells.push(cell);
      }
    }
  } else {
    // 天井配置の場合：x軸方向に拡張
    const centerX = baseCell.x;
    let startX = Math.max(2, centerX - Math.floor(numCells / 2));
    let endX = Math.min(startX + numCells - 1, nMeshX - 3);
    
    // 壁面に達した場合、逆方向に寄せる
    const actualCount = endX - startX + 1;
    if (actualCount < numCells) {
      // 上限に達した場合、下限から配置を調整
      if (endX === nMeshX - 3) {
        startX = Math.max(2, nMeshX - 3 - numCells + 1);
      } else if (startX === 2) {
        endX = Math.min(nMeshX - 3, 2 + numCells - 1);
      }
    }
    
    for (let x = startX; x <= endX; x++) {
      const cell = { ...baseCell, x };
      if (isACAllowedCell(cell, dims)) {
        cells.push(cell);
      }
    }
  }

  return cells.length > 0 ? cells : [baseCell];
}
