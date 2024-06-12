const teamAnshul = ['ALLU Hemani', 'ANSHUL', 'RAVI', 'SATENDRA', 'ABHISHEK', 'VARUN', 'HIMANSHU', 'KAUSHAL', 'SHRASTI', 'SOURABH', 'ARPIT', 'ABISHEK', 'KISHORE', 'AMIT', 'NISHKARSH', 'ADITYA'];
const adminRights = ['Anshul'];
const permissionRightsForMyTodo = [];
const permissionRightsForDashboard = ['Anshul'];
let loginUser;
const bodyContainer = document.getElementById('permissionRightsMsg');

async function updateData(action) {
    const payload = {};
    const status = document.getElementById('status').value;
    const ticketsCount = document.getElementById('ticketsCount').value;
    const toDoList = document.getElementById('todo-input').value;

    if (action === 'updateStatus') {
        payload.status = status;
        payload.ticketsCount = ticketsCount;
    } else if (action === 'updateToDo') {
        payload.toDoList = toDoList;
    }

    try {
        const response = await fetch(`/update-status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Failed to ${action}`);
        }

        alert(`${action.replace('update', '')} updated successfully`);

        if (action === "updateStatus") {
            window.location.href = 'https://hjb3nmfz-3000.inc1.devtunnels.ms/manager-view.html';
        } else if (action === "updateToDo") {
            window.location.href = 'https://hjb3nmfz-3000.inc1.devtunnels.ms/myTodoTask.html';
        }
    } catch (error) {
        console.error(error);
        alert(`Failed to ${action}`);
    }
}

function showHideFields() {
    const statusValue = $('#status').val();
    const ticketsCountElement = $('#ticketsCount');
    const ticketsCountLabel = $('label[for="ticketsCount"]');

    if (statusValue === "Fully Occupied" || statusValue === "Over loaded for the day, looking for help") {
        ticketsCountElement.show().attr('required', 'required');
        ticketsCountLabel.text('Tickets for the day?');
        ticketsCountElement.attr('placeholder', 'Your Total Ticket count for the day?');
    } else if (statusValue !== "" && statusValue !== "Fully Occupied" && statusValue !== "Over loaded for the day, looking for help") {
        ticketsCountLabel.text('Your Availability time');
        ticketsCountElement.attr('placeholder', 'Update your availability slot');
        ticketsCountElement.show().attr('required', 'required');
    } else {
        ticketsCountElement.hide().removeAttr('required').val('');
    }
}

$(document).ready(async function () {
    if ($('#totalUserCount').length) {
        document.getElementById("totalUserCount").textContent = teamAnshul.length;
    }

    try {
        const response = await fetch('/get-user');
        const data = await response.json();
        $('#username').text('Welcome, ' + data.username);
        loginUser = data;

        if (adminRights.includes(data.username)) {
            $('.userId').show();
            $('#userDelete').show();
        } else {
            $('.userId').hide();
            $('#userDelete').hide();
        }
    } catch (error) {
        console.error('Error fetching user:', error);
    }

    fetchData();
});

async function fetchData() {
    if (permissionRightsForDashboard.indexOf(loginUser.teamName) !== -1) {
        if ($('#lessThan1HourCard').length) {
            try {
                const response = await fetch('/team-status');
                const teamStatus = await response.json();

                if (!teamStatus) {
                    console.error('Team status data is undefined or null');
                    return;
                }

                // Clear existing lists
                $('#lessThan1HourList, #2HourList, #3HourList, #4HourList, #fullyOccupiedList, #overloadedList').empty();

                teamStatus.forEach(element => {
                    let listItem = `<li>&#x2022; ${element.username} : ${element.tickets_count}</li>`;
                    switch (element.status) {
                        case "less than 1 hour":
                            $('#lessThan1HourList').append(listItem);
                            break;
                        case "2 hour":
                            $('#2HourList').append(listItem);
                            break;
                        case "3 hour":
                            $('#3HourList').append(listItem);
                            break;
                        case "4 hour":
                            $('#4HourList').append(listItem);
                            break;
                        case "Fully Occupied":
                            $('#fullyOccupiedList').append(listItem);
                            break;
                        case "Over loaded for the day, looking for help":
                            $('#overloadedList').append(listItem);
                            setTimeout(() => {
                                if (element.username === document.getElementById('username').textContent.split(', ')[1]) {
                                    $('#requestHelpButton').show();
                                }
                            }, 500);
                            break;
                        default:
                            console.log("No User found");
                    }
                });
            } catch (error) {
                console.error('Failed to fetch team status:', error);
            }
        }
    } else {
        $('#permissionRightsMsg').text('You do not have permission to view this page. Kindly Contact to Admin');
        $('.viewData').hide();
        $('#clientLists').hide();
    }
}

function toggleAutoRefresh() {
    if ($('#lessThan1HourCard').length) {
        const autoRefreshCheckbox = document.getElementById('autoRefreshToggle');
        if (autoRefreshCheckbox) {
            const autoRefreshEnabled = autoRefreshCheckbox.checked;
            if (autoRefreshEnabled) {
                autoRefreshData();
                setInterval(autoRefreshData, 1 * 60 * 1000);
            } else {
                clearInterval(autoRefreshInterval);
            }
        } else {
            console.error("Auto-refresh toggle checkbox not found.");
        }
    }
}

function autoRefreshData() {
    fetchData();
}

async function userDelete() {
    const userId = document.getElementById('userId').value;
    if (!userId) {
        alert('Please enter a user ID');
        return;
    }

    try {
        const response = await fetch(`/delete-user/${userId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete user');
        }

        const data = await response.text();
        console.log(data);
        alert(`User ${userId} deleted successfully`);
        location.reload();
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
    }
}

function openToDoForm() {
    $('.todo-container').show();
    $('.status-card').hide();
    $('.getUpdate').show();
}

function openUpdateStatusForm() {
    $('.status-card').show();
    $('.todo-container').hide();
}

function toDoDashBoard() {
    $(location).attr('href', 'https://hjb3nmfz-3000.inc1.devtunnels.ms/myTodoTask.html');
}

async function logout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST'
        });

        const data = await response.json();
        alert(data.message);
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Error:', error);
    }
}

function toggleAddUserForm() {
    $("#add-user-form").dialog('open');
}

// request help frontend request management logic
async function raiseRequest() {
    try {
        const response = await fetch('/request-help', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: getLoggedInUserId()
            })
        });

        const data = await response.json();
        alert('Help request sent successfully');
    } catch (error) {
        console.error('Error requesting help:', error);
        alert('Failed to request help');
    }
}

function getLoggedInUserId() {
    return document.getElementById('username').textContent.split(', ')[1];
}

let notificationSound = new Audio('/WCSC5KW-message-notification.mp3');

async function listenForHelpRequests() {
    try {
        const response = await fetch('/check-help-requests');
        const data = await response.json();

        if (data.helpRequests && data.helpRequests.length > 0) {
            data.helpRequests.forEach(request => {
                notificationSound.play();
                if (confirm(`${request.userId} needs help. Do you want to help?`)) {
                    acceptHelpRequest(request.userId);
                }
            });
        }
    } catch (error) {
        console.error('Error listening for help requests:', error);
    }
}
async function acceptHelpRequest(userId) {
    try {
        const response = await fetch('/accept-help-request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId
            })
        });

        const data = await response.json();
        alert(`You have accepted to help ${userId}`);
    } catch (error) {
        console.error('Error accepting help request:', error);
    }
}

function startMarquee(helperId, requesterId) {
    const marqueeContainer = document.getElementById('marqueeContainer');
    const marqueeText = document.getElementById('marqueeText');
    marqueeText.textContent = `${helperId} is helping ${requesterId}`;
    marqueeContainer.style.display = 'block';
}

function stopMarquee() {
    const marqueeContainer = document.getElementById('marqueeContainer');
    marqueeContainer.style.display = 'none';
}

function markHelpDone() {
    fetch('/help-done', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                helperId: getLoggedInUserId()
            })
        })
        .then(response => response.json())
        .then(data => {
            alert('Help marked as done');
            stopMarquee();
        })
        .catch(error => {
            console.error('Error marking help done:', error);
            alert('Failed to mark help done');
        });
}

setInterval(listenForHelpRequests, 10000);

let completedTasks = [];
$(document).ready(function () {
    let userIdFromDb = "";
    let userNameDb = "";
    let todoLists = [];
    let taskStatus;

    fetch('/get-user')
        .then(response => response.json())
        .then(data => {
            userIdFromDb = data.id;
            userNameDb = data.username;
            console.log('userProfileName', userIdFromDb);
            $("#add-user-form").dialog({
                autoOpen: false,
                modal: true,
                width: 400
            });

            $('.add-user-button').on('click', function () {
                $("#add-user-form").dialog('open');
            });
            fetchTodos();
        })
        .catch(error => {
            console.error('Error fetching user information:', error);
        });

    function fetchTodos() {
        fetch('/all-todos')
            .then(response => response.json())
            .then(data => {
                todoLists = data[userIdFromDb] || [];
                displayTodos();
            })
            .catch(error => {
                console.error('Error fetching to-do lists:', error);
            });
    }

    function showCollaboratorPopup(task) {
        fetch('/team-members')
            .then(response => response.json())
            .then(data => {
                const select = document.getElementById('collaborator-select');
                select.innerHTML = '<option>Select</option>';
                data.forEach(member => {
                    const option = document.createElement('option');
                    option.value = member.id;
                    option.textContent = member.username;
                    select.appendChild(option);
                });
                $('#collaborator-popup').dialog({
                    autoOpen: true,
                    modal: true,
                    buttons: {
                        "Save": function () {
                            const collaboratorId = select.value;
                            addCollaborator(task, collaboratorId);
                            $(this).dialog('close');
                        },
                        "Cancel": function () {
                            $(this).dialog('close');
                        }
                    }
                });
            })
            .catch(error => {
                console.error('Error fetching team members:', error);
            });
    }

    function displayTodos() {
        const container = document.getElementById('todo-lists-container');
        container.innerHTML = '';
        if (todoLists.length === 0) {
            container.innerHTML = '<p>No to-do lists exist. Would you like to create one?</p>';
            const createTodoButton = document.createElement('button');
            createTodoButton.textContent = 'Create To-Do';
            createTodoButton.onclick = () => $("#add-user-form").dialog('open');
            container.appendChild(createTodoButton);
        } else {
            const userCard = document.createElement('div');
            userCard.classList.add('user-card');

            const userHeader = document.createElement('div');
            userHeader.classList.add('user-header');

            const userHeaderTitle = document.createElement('h2');
            userHeaderTitle.textContent = userNameDb;
            userHeader.appendChild(userHeaderTitle);

            const deleteUserButton = document.createElement('button');
            deleteUserButton.textContent = 'Delete Card';
            deleteUserButton.classList.add('delete-user-button');
            deleteUserButton.onclick = () => deleteUser(userIdFromDb);
            userHeader.appendChild(deleteUserButton);

            userCard.appendChild(userHeader);

            const ul = document.createElement('ul');
            todoLists.forEach(todoItem => {
                if (!todoItem.done) {
                    const li = document.createElement('li');
                    li.textContent = todoItem.task;

                    const buttonsDiv = document.createElement('div');
                    buttonsDiv.classList.add('buttons-right');

                    const markDoneButton = document.createElement('button');
                    markDoneButton.innerHTML = '<i class="fas fa-check"></i>';
                    markDoneButton.onclick = () => markAsDone(userIdFromDb, todoItem.task);
                    buttonsDiv.appendChild(markDoneButton);

                    const editButton = document.createElement('button');
                    editButton.innerHTML = '<i class="fas fa-edit" alt="Edit"></i>';
                    editButton.onclick = () => editToDoItem(userIdFromDb, todoItem.task);
                    buttonsDiv.appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
                    deleteButton.onclick = () => deleteToDoItem(userIdFromDb, todoItem.task);
                    buttonsDiv.appendChild(deleteButton);

                    const collaboratorButton = document.createElement('button');
                    collaboratorButton.innerHTML = '<i class="fas fa-user-friends"></i>';
                    collaboratorButton.onclick = () => showCollaboratorPopup(todoItem.task);
                    buttonsDiv.appendChild(collaboratorButton);

                    li.appendChild(buttonsDiv);
                    ul.appendChild(li);
                }
            });

            userCard.appendChild(ul);

            const addTodoDiv = document.createElement('div');
            addTodoDiv.classList.add('add-todo');

            const addTodoInput = document.createElement('input');
            addTodoInput.type = 'text';
            addTodoInput.placeholder = 'New to-do item';
            addTodoDiv.appendChild(addTodoInput);

            const addTodoButton = document.createElement('button');
            addTodoButton.textContent = 'Add To-Do';
            addTodoButton.onclick = () => addToDoItem(userIdFromDb, addTodoInput.value);
            addTodoDiv.appendChild(addTodoButton);

            userCard.appendChild(addTodoDiv);

            container.appendChild(userCard);
        }
    }

    // function toggleButtons(listItem) {
    //     const buttons = listItem.querySelector('.buttons-right');
    //     if (buttons.style.display === 'flex') {
    //         buttons.style.display = 'none';
    //     } else {
    //         buttons.style.display = 'flex';
    //     }
    // }

    function markAsDone(userId, toDo) {
        fetch('/mark-done', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    toDo
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to mark to-do as done');
                }
                alert('To-do marked as done successfully');
                fetchTodos();
            })
            .catch(error => console.error('Error marking to-do as done:', error));
    }

    function editToDoItem(userId, oldToDo) {
        const newToDo = prompt('Edit your to-do:', oldToDo);
        if (newToDo) {
            fetch('/edit-todo', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        userId,
                        oldToDo,
                        newToDo
                    })
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to edit to-do');
                    }
                    alert('To-do edited successfully');
                    fetchTodos();
                })
                .catch(error => {
                    console.error('Error editing to-do:', error);
                });
        }
    }

    function deleteToDoItem(userId, toDo) {
        fetch('/delete-todo', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    toDo
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to delete to-do');
                }
                alert('To-do deleted successfully');
                fetchTodos();
            })
            .catch(error => {
                console.error('Error deleting to-do:', error);
            });
    }

    function addToDoItem(userId, newToDo) {
        if (newToDo.trim() === '') {
            alert('Please enter a valid to-do item');
            return;
        }

        fetch('/update-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId,
                    toDoList: newToDo
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('To-do added successfully');
                    fetchTodos();
                } else {
                    console.error('Failed to add to-do:', data.message);
                    alert('Failed to add to-do');
                }
            })
            .catch(error => {
                console.error('Error adding to-do:', error);
            });
    }

    function deleteUser(userId) {
        const pathname = window.location.pathname;
        if (confirm(`Are you sure you want to delete ${userId} and all their incomplete to-dos?`)) {
            fetch(`/delete-user/${userId}?pathname=${pathname}`, {
                    method: 'DELETE'
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to delete user card');
                    }
                    alert(`User ${userId} Card deleted successfully`);
                    fetchTodos();
                })
                .catch(error => {
                    console.error('Error deleting user card:', error);
                });
        }
    }

    function addCollaborator(task, collaboratorId) {
        fetch('/add-collaborator', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    task,
                    collaboratorId
                })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to add collaborator');
                }
                alert('Collaborator added successfully');
                fetchTodos();
            })
            .catch(error => console.error('Error adding collaborator:', error));
    }
});

function addNewCard() {
    const newUserTodo = document.getElementById('newUserTodo').value;

    if (newUserTodo.trim() === '') {
        alert('Please enter a valid to-do item');
        return;
    }

    fetch('/update-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                toDoList: newUserTodo
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('New card added successfully');
                $("#add-user-form").dialog('close');
                window.location.reload();
            } else {
                console.error('Failed to add new card:', data.message);
                alert('Failed to add new card');
            }
        })
        .catch(error => {
            console.error('Error adding new card:', error);
        });
}

function viewCompletedTasks() {
    const container = document.getElementById('todo-lists-container');
    container.style.display = 'none'; // Hide the to-do container

    fetch('/completed-todos')
        .then(response => response.json())
        .then(data => {
            if (completedTasks.length === 0) {
                completedTasks = data;
                const completedContainer = document.createElement('div');
                completedContainer.id = 'completed-tasks-container';
                completedContainer.innerHTML = '<h2>Completed Tasks</h2>';
                const downloadButton = document.createElement('button');
                downloadButton.textContent = 'Download CSV';
                downloadButton.onclick = downloadCompletedTasks;
                completedContainer.appendChild(downloadButton);

                const table = document.createElement('table');
                table.classList.add('completed-tasks-table');

                const headerRow = document.createElement('tr');
                const taskHeader = document.createElement('th');
                taskHeader.textContent = 'Task';
                const dateHeader = document.createElement('th');
                dateHeader.textContent = 'Completed Date';
                headerRow.appendChild(taskHeader);
                headerRow.appendChild(dateHeader);
                table.appendChild(headerRow);

                data.forEach(todo => {
                    const row = document.createElement('tr');
                    const taskCell = document.createElement('td');
                    taskCell.textContent = todo.task;
                    const dateCell = document.createElement('td');
                    dateCell.textContent = new Date(todo.completed_at).toLocaleDateString();
                    row.appendChild(taskCell);
                    row.appendChild(dateCell);
                    table.appendChild(row);
                });

                completedContainer.appendChild(table);
                document.body.appendChild(completedContainer);
            }
        })
        .catch(error => console.error('Error fetching completed tasks:', error));
}

function downloadCompletedTasks() {
    fetch('/download-completed-tasks')
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'completed_tasks.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => console.error('Error downloading completed tasks:', error));
}

// Existing JavaScript ...
let sheets = []; // Declare sheets in the global scope

(async () => {
    try {
        const response = await fetch('/get-user');
        const data = await response.json();

        // Define sheets array after loginUser is assigned
        sheets = [{
                name: "Bolt 2.0",
                id: "Bolt",
                gid: "",
                accessTo: data.allOtherUser
            }, {
                name: "Client List",
                id: "1qH1UsHfxXPeDr3XkhPKSigiJBvaecNip-8EUXwI2Cxo",
                gid: "1894202733",
                accessTo: data.allOtherUser
            },
            {
                name: "LPU Online Fee Setup",
                id: "1VBgqWRQAztsSnka8gLheZHG0I77UwZkSeq3AVaqwGRY",
                gid: "1599463974",
                accessTo: data.allOtherUser
            },
            {
                name: "LPU Implementation",
                id: "16eoY49j1BtrpC-oQZhuvRt3ODK3LksTu4cEoydEYx3g",
                gid: "952375866",
                accessTo: data.allOtherUser
            },
            {
                name: "Anshul Tracker",
                id: "1OK0vNri6q7ViKYOtTayi2eKBXYph5oSl3lo7iQRpf9A",
                gid: "1491203487",
                accessTo: ["Anshul"]
            },
            {
                name: "Anshul DataSheet",
                id: "1uBeDH0ikDtJA4ty-38OcM4mJ4qUMRLoy-5w03Cx2B2A",
                gid: "0",
                accessTo: ["Anshul"]
            },
            {
                name: "BLR Use Cases",
                id: "1Cb1RFZXwoleo6yr44ghCPI1DCUHCY8xVE1aqamOqg9Y",
                gid: "0",
                accessTo: data.allOtherUser
            },
            {
                name: "BLR Time Sheet",
                id: "15eeEyxWEgEJRoe1cDoXW2m_9Z_jWclP2U1sHE79BlTU",
                gid: "869078832",
                accessTo: data.allOtherUser
            },
        ];

        populateDropdown(); // Call populateDropdown after sheets are defined
    } catch (error) {
        console.error('Error fetching user:', error);
    }
})();

// Function to populate the dropdown menu
function populateDropdown() {
    const sheetList = document.getElementById('sheetList');
    sheets.forEach(sheet => {
        const li = document.createElement('li');
        li.textContent = sheet.name;
        li.dataset.value = `${sheet.id}/${sheet.gid}`;
        li.onclick = viewClients;
        sheetList.appendChild(li);
    });
}

// Toggle dropdown visibility
function toggleDropdown() {
    const dropdown = document.getElementById('dropdown');
    dropdown.style.display = dropdown.style.display === 'none' || dropdown.style.display === '' ? 'block' : 'none';
}

// View selected client sheet
async function viewClients(event) {
    $('.viewData').hide();
    const selectedValue = event.target.dataset.value;
    const iframeContainer = document.getElementById('iframeContainer');
    const iframe = document.createElement('iframe');

    if (selectedValue) {
        const sheet = sheets.find(sheet => sheet.id === selectedValue.split('/')[0]);
        const accessGranted = sheet.accessTo === loginUser.allOtherUser || sheet.accessTo.includes(loginUser.username);

        if (!accessGranted) {
            $('#permissionRightsMsg').text('Accesss Denied.');
            $('iframe').hide();
            return;
        } else {
            $('#permissionRightsMsg').text('');
        }

        // Remove existing iframe if any
        const existingIframe = document.getElementById('viewClientList');
        if (existingIframe) {
            existingIframe.remove();
        }

        // Create a new iframe element
        iframe.id = 'viewClientList';
        if (selectedValue.split('/')[0] === "Bolt") {
            window.open("https://script.google.com/a/macros/meritto.com/s/AKfycbwRZn_XWHqKeQMSlMg9Ohi1wsdGDttHq6zv0_O71YejxtIejZAc77P9gl4NuFX-3OixVQ/exec");
        } else {
            iframe.src = `https://docs.google.com/spreadsheets/d/${selectedValue.split('/')[0]}/edit#gid=${selectedValue.split('/')[1]}`;
        }
        iframe.width = '100%'; // Optional: set width
        iframe.height = '650px'; // Optional: set height

        // Append the iframe to the iframeContainer
        iframeContainer.appendChild(iframe);
    }

    // Hide dropdown after selection
    toggleDropdown();
}