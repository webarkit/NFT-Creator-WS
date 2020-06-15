function start() {
  const nftLink = document.getElementById('nftLink').value
  window.location.href = "https://demo1.tripod-digital.co.nz/?t=" + btoa(nftLink) + "&v="+ btoa("https://cafe.tripod-digital.co.nz/videos/surf.mp4")
}