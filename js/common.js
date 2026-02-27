// サイドバー開閉
function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

// モーダル開閉
function openModal(id) {
  document.getElementById(id).classList.add('show');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

// 削除確認
function confirmDelete(name) {
  return confirm('「' + name + '」を削除しますか？この操作は取り消せません。');
}
