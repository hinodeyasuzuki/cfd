<script setup>
const emit = defineEmits(['load'])

const upload = async (event) => {
  const files = event.target.files || event.dataTransfer.files
  const file = files[0]

  if (!checkFile(file)) {
    alert("ファイルを読み込めませんでした")
    return
  }
  const logData = await getFileData(file)
  const jsondata = JSON.parse(logData)
  emit('load', jsondata)
}

const getFileData = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsText(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = error => reject(error)
  })
}

const checkFile = (file) => {
  if (!file) return false
  if (file.type !== 'application/json') return false
  const SIZE_LIMIT = 5000000 // 5MB
  if (file.size > SIZE_LIMIT) return false
  return true
}
</script>

<template>
  <span>ファイルの読み込み：　<input type="file" @change="upload" /></span>
</template>
