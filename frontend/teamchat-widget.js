$(document).ready(async function () {
    let notificationSound = new Audio('/WCSC5KW-message-notification.mp3');

    // Fetch user data before initializing the socket connection
    const response = await fetch('/get-user');
    const loginUser = await response.json();

    // Check if loginUser is properly fetched
    if (!loginUser || !loginUser.id) {
        console.error('Error: User data not found');
        return;
    }

    const socket = io.connect('https://s8g04bhj-3000.inc1.devtunnels.ms', {
        query: {
            userId: loginUser.id
        }
    });

    const username = loginUser.username;
    const teamName = loginUser.teamName;

    socket.emit('joinTeam', teamName); // Join the team room

    $('#teamChatButton').click(function () {
        $('#chat').dialog('open');
        $('#chatBadge').hide();
        $('#chatBadge').text('0');
    });

    $('#messageForm').submit(function (e) {
        e.preventDefault();
        const message = $('#messageInput').val();

        socket.emit('sendMessage', {
            teamName,
            message,
            username
        });
        $('#messageInput').val('');
    });

    socket.on('receiveMessage', (data) => {
        const {
            message,
            username,
            timestamp
        } = data;
        notificationSound.play();
        const messageClass = username === loginUser.username ? 'sent' : 'received';
        $('#messages').append(
            `<div class="message ${messageClass}"><strong>${username}</strong>: ${message}</div>`
        );

        // Show notification badge if chat dialog is closed
        if (!$('#chat').dialog('isOpen')) {
            let badgeCount = parseInt($('#chatBadge').text());
            badgeCount++;
            $('#chatBadge').text(badgeCount);
            $('#chatBadge').show();
        }
    });

    socket.on('onlineUsers', (onlineUsers) => {
        const onlineCount = onlineUsers.length;
        console.log('onlineCount' + onlineCount + onlineUsers);
        $('#ui-id-1').append('<span id="onlineUsersCount" style="float:right"></span>');
        $('#onlineUsersCount').text(` Online users: ${onlineCount}`);
    });

    socket.on('receiveNotification', (data) => {
        const {
            message,
            username,
            timestamp
        } = data;
        $('#messages').append(
            `<div class="message notification"><strong>${username}</strong>: ${message}</div>`
        );
    });

    $('#chat').dialog({
        autoOpen: false,
        modal: true,
        width: 400
    });

    // GIF Button setup
    $('#gifButton').click((event) => {
        event.preventDefault();
        $('#gifSearchContainer').toggle();
    });

    $('#gifSearchInput').on('input', async function () {
        const query = $(this).val();
        if (query.length > 2) {
            const response = await fetch(
                `https://api.giphy.com/v1/gifs/search?api_key=vfAD4fmP35qSoSHAtLNQqLFB9WVnSICn&q=${query}&limit=10`
            );
            const result = await response.json();
            const gifs = result.data;

            $('#gifResults').empty();
            gifs.forEach(gif => {
                const gifUrl = gif.images.fixed_height_small.url;
                $('#gifResults').append(`<img src="${gifUrl}" alt="GIF" />`);
            });

            $('#gifResults img').click(function () {
                const gifUrl = $(this).attr('src');
                socket.emit('sendMessage', {
                    teamName,
                    message: `<img src="${gifUrl}" alt="GIF" />`,
                    username
                });
                $('#gifSearchContainer').hide();
            });
        }
    });

    // Populate teams and users for the dialog
    async function populateTeams() {
        const teamsResponse = await fetch('/all-teams');
        const teamsData = await teamsResponse.json();
        const teamSelect = $('#teamSelect');

        teamSelect.empty();
        teamsData.forEach(team => {
            teamSelect.append(new Option(team.teamName, team.teamName));
        });
    }

    $('#joinTeamButton').click(function () {
        const selectedTeam = $('#teamSelect').val();
        socket.emit('joinDifferentTeam', {
            teamName: selectedTeam,
            username: loginUser.username,
            originalTeam: loginUser.teamName
        });
        $('#teamSelectDialog').dialog('close');
    });

    $('#teamSelectDialog').dialog({
        autoOpen: false,
        modal: true,
        width: 400
    });

    $('#teamChatButton').dblclick(function () {
        populateTeams();
        $('#teamSelectDialog').dialog('open');
    });
});