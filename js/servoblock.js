function servoHide() {
    var x = document.getElementById('servoB');
    if (x.style.display === "none") {
        x.style.display = 'block';
        document.getElementById('servoBtn').innerHTML = 'Hide menu';
    } else {
        x.style.display = 'none';
        document.getElementById('servoBtn').innerHTML = 'Show menu';
    }
}
