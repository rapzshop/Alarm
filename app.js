// DOM Elements
const currentTimeEl = document.getElementById('currentTime');
const currentDateEl = document.getElementById('currentDate');
const hourInput = document.getElementById('hour');
const minuteInput = document.getElementById('minute');
const secondInput = document.getElementById('second');
const alarmNameInput = document.getElementById('alarmName');
const repeatTypeSelect = document.getElementById('repeatType');
const soundTypeSelect = document.getElementById('soundType');
const setAlarmBtn = document.getElementById('setAlarm');
const clearAllBtn = document.getElementById('clearAll');
const alarmsContainer = document.getElementById('alarmsContainer');
const emptyState = document.getElementById('emptyState');
const notification = document.getElementById('notification');
const installButton = document.getElementById('installButton');
const permissionButton = document.getElementById('permissionButton');
const alarmActiveScreen = document.getElementById('alarmActiveScreen');
const activeAlarmTime = document.getElementById('activeAlarmTime');
const activeAlarmName = document.getElementById('activeAlarmName');
const snoozeBtn = document.getElementById('snoozeBtn');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
const quickAlarmButtons = document.querySelectorAll('.quick-alarm-btn');

// Alarm sounds
const alarmSounds = {
    default: document.getElementById('alarmSoundDefault'),
    bell: document.getElementById('alarmSoundBell'),
    beep: document.getElementById('alarmSoundBeep'),
    melody: document.getElementById('alarmSoundMelody')
};

// Alarm data
let alarms = JSON.parse(localStorage.getItem('alarms')) || [];
let currentActiveAlarm = null;
let alarmTimeout = null;

// Update current time
function updateTime() {
    const now = new Date();
    const time = now.toLocaleTimeString('id-ID', { hour12: false });
    const date = now.toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    currentTimeEl.textContent = time;
    currentDateEl.textContent = date;
    
    // Check if any alarm should trigger
    checkAlarms(now);
    
    requestAnimationFrame(updateTime);
}

// Check if any alarms should trigger
function checkAlarms(now) {
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS format
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    alarms.forEach((alarm, index) => {
        if (alarm.time === currentTime && !alarm.triggered && shouldAlarmTrigger(alarm, currentDay)) {
            triggerAlarm(index);
        }
    });
}

// Check if alarm should trigger based on repeat settings
function shouldAlarmTrigger(alarm, currentDay) {
    if (alarm.repeatType === 'once') {
        return true;
    } else if (alarm.repeatType === 'daily') {
        return true;
    } else if (alarm.repeatType === 'weekdays') {
        return currentDay >= 1 && currentDay <= 5; // Monday to Friday
    } else if (alarm.repeatType === 'weekends') {
        return currentDay === 0 || currentDay === 6; // Sunday or Saturday
    }
    return true;
}

// Trigger an alarm
function triggerAlarm(index) {
    const alarm = alarms[index];
    alarm.triggered = true;
    currentActiveAlarm = { ...alarm, index };
    
    // Play alarm sound
    const sound = alarmSounds[alarm.soundType] || alarmSounds.default;
    sound.play().catch(e => console.log('Error playing sound:', e));
    
    // Update alarm in localStorage
    localStorage.setItem('alarms', JSON.stringify(alarms));
    
    // Show alarm screen
    showAlarmScreen(alarm);
    
    // Show push notification
    showPushNotification(alarm);
    
    // Update UI
    renderAlarms();
    
    // Auto-stop alarm after 10 minutes
    alarmTimeout = setTimeout(() => {
        if (currentActiveAlarm && currentActiveAlarm.index === index) {
            stopAlarm(index);
        }
    }, 600000); // 10 minutes
}

// Show alarm screen
function showAlarmScreen(alarm) {
    const [hours, minutes] = alarm.time.split(':');
    activeAlarmTime.textContent = `${hours}:${minutes}`;
    activeAlarmName.textContent = alarm.name || 'Alarm';
    alarmActiveScreen.style.display = 'flex';
    
    // Request wake lock to keep screen on
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen').catch(e => {
            console.log('Wake lock failed:', e);
        });
    }
}

// Show push notification
function showPushNotification(alarm) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const [hours, minutes] = alarm.time.split(':');
        const notification = new Notification('⏰ Alarm Berbunyi!', {
            body: `Waktu: ${hours}:${minutes} - ${alarm.name || 'Alarm'}`,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏰</text></svg>',
            tag: 'alarm-notification',
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200]
        });
        
        notification.onclick = function() {
            window.focus();
            this.close();
        };
    }
}

// Stop an alarm
function stopAlarm(index) {
    // Stop all alarm sounds
    Object.values(alarmSounds).forEach(sound => {
        sound.pause();
        sound.currentTime = 0;
    });
    
    // Hide alarm screen
    alarmActiveScreen.style.display = 'none';
    
    // Release wake lock
    if ('wakeLock' in navigator) {
        navigator.wakeLock.release();
    }
    
    // Clear timeout
    if (alarmTimeout) {
        clearTimeout(alarmTimeout);
        alarmTimeout = null;
    }
    
    // Update alarm status
    if (index !== undefined) {
        const alarm = alarms[index];
        if (alarm) {
            if (alarm.repeatType === 'once') {
                // Remove one-time alarm
                alarms.splice(index, 1);
            } else {
                // Reset triggered status for repeating alarms
                alarm.triggered = false;
            }
            
            localStorage.setItem('alarms', JSON.stringify(alarms));
            renderAlarms();
        }
    }
    
    currentActiveAlarm = null;
    
    // Show notification
    showNotification('Alarm dihentikan!');
}

// Snooze alarm
function snoozeAlarm(minutes = 5) {
    if (!currentActiveAlarm) return;
    
    // Stop current alarm
    stopAlarm(currentActiveAlarm.index);
    
    // Calculate snooze time
    const now = new Date();
    const snoozeTime = new Date(now.getTime() + minutes * 60000);
    const hour = snoozeTime.getHours().toString().padStart(2, '0');
    const minute = snoozeTime.getMinutes().toString().padStart(2, '0');
    const second = snoozeTime.getSeconds().toString().padStart(2, '0');
    
    // Add snooze alarm
    alarms.push({
        time: `${hour}:${minute}:${second}`,
        name: `Tunda: ${currentActiveAlarm.name || 'Alarm'}`,
        repeatType: 'once',
        soundType: currentActiveAlarm.soundType || 'default',
        triggered: false
    });
    
    localStorage.setItem('alarms', JSON.stringify(alarms));
    renderAlarms();
    
    showNotification(`Alarm ditunda ${minutes} menit!`);
}

// Set a new alarm
function setAlarm() {
    const hour = hourInput.value.padStart(2, '0');
    const minute = minuteInput.value.padStart(2, '0');
    const second = secondInput.value.padStart(2, '0');
    const name = alarmNameInput.value.trim() || 'Alarm';
    const repeatType = repeatTypeSelect.value;
    const soundType = soundTypeSelect.value;
    
    // Validate time
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) {
        showNotification('Waktu tidak valid!', 'error');
        return;
    }
    
    const time = `${hour}:${minute}:${second}`;
    
    // Check if alarm already exists
    if (alarms.some(alarm => alarm.time === time && alarm.name === name)) {
        showNotification('Alarm sudah ada!', 'error');
        return;
    }
    
    // Add new alarm
    alarms.push({
        time,
        name,
        repeatType,
        soundType,
        triggered: false
    });
    
    // Save to localStorage
    localStorage.setItem('alarms', JSON.stringify(alarms));
    
    // Update UI
    renderAlarms();
    
    // Show notification
    showNotification('Alarm berhasil diatur!');
    
    // Reset form
    alarmNameInput.value = '';
}

// Set quick alarm
function setQuickAlarm(minutes) {
    const now = new Date();
    const alarmTime = new Date(now.getTime() + minutes * 60000);
    const hour = alarmTime.getHours().toString().padStart(2, '0');
    const minute = alarmTime.getMinutes().toString().padStart(2, '0');
    
    hourInput.value = hour;
    minuteInput.value = minute;
    secondInput.value = '00';
    alarmNameInput.value = `Alarm ${minutes} menit lagi`;
    
    setAlarm();
}

// Delete an alarm
function deleteAlarm(index) {
    // Stop alarm if it's ringing
    if (alarms[index].triggered) {
        stopAlarm(index);
    }
    
    alarms.splice(index, 1);
    localStorage.setItem('alarms', JSON.stringify(alarms));
    renderAlarms();
    showNotification('Alarm dihapus!');
}

// Clear all alarms
function clearAllAlarms() {
    if (alarms.length === 0) return;
    
    // Stop any ringing alarms
    if (currentActiveAlarm) {
        stopAlarm(currentActiveAlarm.index);
    }
    
    alarms = [];
    localStorage.setItem('alarms', JSON.stringify(alarms));
    renderAlarms();
    showNotification('Semua alarm telah dihapus!');
}

// Render alarms list
function renderAlarms() {
    if (alarms.length === 0) {
        emptyState.style.display = 'block';
        alarmsContainer.innerHTML = '';
        alarmsContainer.appendChild(emptyState);
        return;
    }
    
    emptyState.style.display = 'none';
    
    alarmsContainer.innerHTML = '';
    
    alarms.forEach((alarm, index) => {
        const alarmItem = document.createElement('div');
        alarmItem.className = `alarm-item ${alarm.triggered ? 'ringing' : ''}`;
        
        const [hours, minutes, seconds] = alarm.time.split(':');
        const timeString = `${hours}:${minutes}${seconds !== '00' ? `:${seconds}` : ''}`;
        
        // Repeat type text
        let repeatText = '';
        switch (alarm.repeatType) {
            case 'daily': repeatText = 'Setiap Hari'; break;
            case 'weekdays': repeatText = 'Hari Kerja'; break;
            case 'weekends': repeatText = 'Akhir Pekan'; break;
            case 'once': repeatText = 'Sekali'; break;
            default: repeatText = alarm.repeatType;
        }
        
        alarmItem.innerHTML = `
            <div class="alarm-info">
                <div class="alarm-time">${timeString}</div>
                <div class="alarm-name">${alarm.name}</div>
                <div class="alarm-repeat">${repeatText} • ${alarm.soundType}</div>
            </div>
            <div class="alarm-actions">
                ${alarm.triggered ? 
                    `<button class="btn-action btn-stop" data-index="${index}">
                        <i class="fas fa-stop"></i>
                    </button>` : ''
                }
                <button class="btn-action btn-delete" data-index="${index}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        alarmsContainer.appendChild(alarmItem);
    });
    
    // Add event listeners to action buttons
    document.querySelectorAll('.btn-stop').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            stopAlarm(index);
        });
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            deleteAlarm(index);
        });
    });
}

// Show notification
function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = 'notification show';
    
    if (type === 'error') {
        notification.style.background = 'var(--secondary)';
    } else {
        notification.style.background = 'var(--success)';
    }
    
    setTimeout(() => {
        notification.className = 'notification';
    }, 3000);
}

// Request notification permission
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showNotification('Browser tidak mendukung notifikasi', 'error');
        return;
    }
    
    if (Notification.permission === 'granted') {
        showNotification('Notifikasi sudah diaktifkan!');
        return;
    }
    
    if (Notification.permission === 'denied') {
        showNotification('Izin notifikasi ditolak. Aktifkan di pengaturan browser.', 'error');
        return;
    }
    
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        showNotification('Notifikasi diaktifkan! Alarm akan muncul di layar depan.');
    } else {
        showNotification('Izin notifikasi ditolak', 'error');
    }
}

// PWA Installation
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installButton.style.display = 'block';
});

installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            installButton.style.display = 'none';
        }
        
        deferredPrompt = null;
    }
});

// Event listeners
setAlarmBtn.addEventListener('click', setAlarm);
clearAllBtn.addEventListener('click', clearAllAlarms);
permissionButton.addEventListener('click', requestNotificationPermission);
snoozeBtn.addEventListener('click', () => snoozeAlarm(5));
stopAlarmBtn.addEventListener('click', () => {
    if (currentActiveAlarm) {
        stopAlarm(currentActiveAlarm.index);
    }
});

// Quick alarm buttons
quickAlarmButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const minutes = parseInt(btn.getAttribute('data-minutes'));
        setQuickAlarm(minutes);
    });
});

// Input validation
[hourInput, minuteInput, secondInput].forEach(input => {
    input.addEventListener('change', function() {
        let value = parseInt(this.value);
        
        if (this.id === 'hour') {
            if (value < 0) this.value = '0';
            if (value > 23) this.value = '23';
        } else {
            if (value < 0) this.value = '0';
            if (value > 59) this.value = '59';
        }
        
        // Pad with leading zero if needed
        if (this.value.length === 1) {
            this.value = '0' + this.value;
        }
    });
});

// Close alarm screen on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && alarmActiveScreen.style.display === 'flex') {
        if (currentActiveAlarm) {
            stopAlarm(currentActiveAlarm.index);
        }
    }
});

// Initialize
updateTime();
renderAlarms();

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(() => {
        showNotification('Aktifkan notifikasi untuk alarm layar depan');
    }, 2000);
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('SW registered:', registration);
            })
            .catch(error => {
                console.log('SW registration failed:', error);
            });
    });
               }
