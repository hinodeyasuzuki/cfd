export function isACAllowedCell(cell, dims) {
  const { nMeshX, nMeshY, nMeshZ } = dims;

  const isCeilingPosition =
    cell.y === nMeshY - 3 &&
    cell.x >= 2 && cell.x <= nMeshX - 2 &&
    cell.z >= 2 && cell.z <= nMeshZ - 2;

  return isCeilingPosition;
}
