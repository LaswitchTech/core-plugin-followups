const FollowupForm = function(form,contacts,values = {},modal = null){

    // Initialize Values
    var Values = {
        category: null,
        vcard: null,
        date: moment().format('YYYY-MM-DD'),
        time: moment().format('HH:mm'),
    };

    // Set Values
    if(values){
        for(const [key, value] of Object.entries(values)){
            if(typeof Values[key] !== 'undefined'){
                switch(key){
                    case 'country':
                    case 'state':
                        Values[key] = value;
                        if(typeof value.code !== 'undefined') Values[key] = value.code;
                        break;
                    default:
                        Values[key] = value;
                        break;
                }
            }
        }
    }

    // category
    form.add(
        {
            name: 'category',
            label: 'category',
            icon: 'hash',
            type: 'hidden',
            value: Values.category,
        },
        function(input,form){
            input.css('display','none');
        },
    );

    // vCard
    form.add(
        {
            name: 'vcard',
            label: builder.Locale.get('Contact'),
            icon: 'hash',
            type: 'select2',
            options: contacts,
            modal: modal,
            value: Values.vcard,
            class: {
                field: 'col-12',
                label: 'text-bg-primary',
            },
        },
        function(input,form){
            if(Values.category === 'Call'){
                input.removeClass('mb-3');
            }
        }
    );

    // date
    form.add(
        {
            name: 'date',
            label: builder.Locale.get('Date'),
            icon: 'calendar',
            type: 'date',
            value: Values.date,
            class: {
                field: 'col-6',
            },
        },
        function(input,form){
            if(Values.category !== 'Call'){
                input.removeClass('mb-3');
            } else {
                input.css('display','none');
            }
        }
    );

    // time
    form.add(
        {
            name: 'time',
            label: builder.Locale.get('Time'),
            icon: 'clock',
            type: 'time',
            value: Values.time,
            class: {
                field: 'col-6',
            },
        },
        function(input,form){
            if(Values.category !== 'Call'){
                input.removeClass('mb-3');
            } else {
                input.css('display','none');
            }
        }
    );
};
const FollowupModalCreate = function(fields = {}, dt = null, callback = null){

    // Check if a targetTable and targetId are set
    if(typeof fields.targetTable === 'undefined' || typeof fields.targetId === 'undefined'){
        console.error("FollowupModalCreate: targetTable or targetId is not set.");
        return;
    }

    // Initialize Contacts
    var contacts = [];

    // Create a function to create contacts from the records
    function createContact(records, callback = null){
        for(const [key, contact] of Object.entries(records ?? {})){
            var id = contact.vcard.id ?? (contact.id ?? null);
            var name = contact.vcard.name ?? (contact.name ?? null);
            var title = contact.vcard.title ?? (contact.title ?? null);
            var text = name;
            if(title != null){
                text += ' - ' + contact.vcard.title;
            }
            if(id !== null && text !== null){
                contacts.push({id:contact.vcard.id,text:text});
            }
        }
        if(typeof callback === "function"){
            callback();
        }
    }

    // Create and open the modal
    function createModal(){
        builder.Component(
            "modal",
            null,
            {
                onEnter: false,
                destroy: true,
                icon: "plus-lg",
                title: builder.Locale.get("Followup with someone"),
                cancel: false,
                submit: true,
                size: "lg",
                callback: {
                    submit: function(element,modal){
                        element.form.submit();
                    },
                    onHide: function(component,modal){
                        if(typeof component.record !== 'undefined'){
                            NoteModal(component.record.id, component.record.subject);
                        }
                    },
                },
            },
            function(modal,component){
                const componentModal = component;
                component.addClass('modal-success');
                component.footer.submit.addClass('btn-success').removeClass('btn-link').attr({
                    "style": "border-bottom-right-radius: var(--bs-modal-inner-border-radius) !important;border-bottom-left-radius: var(--bs-modal-inner-border-radius) !important;",
                }).text(builder.Locale.get('Create'));
                component.footer.submit.icon = $(document.createElement('i')).addClass('bi bi-stars me-1').prependTo(component.footer.submit);
                component.form = builder.Component(
                    'form',
                    component.body,
                    {
                        class:{
                            form: 'row row-cols-3',
                            field: 'mb-3 col',
                        },
                        callback:{
                            val: function(values){
                                values.due = values.date+" "+values.time;
                                delete values.date;
                                delete values.time;
                                for(const [key, value] of Object.entries(fields)){
                                    if(typeof values[key] === 'undefined'){
                                        values[key] = value;
                                    }
                                }
                                return values;
                            },
                            submit: function(form){
                                $.ajax({
                                    url: '/api/followups/create',
                                    headers: {'X-CSRF-Authorization': CSRF_KEY},
                                    type: 'POST',dataType: 'json',
                                    data: form.val(),
                                    success: function(response) {

                                        // Check if the datatable is available
                                        if(dt){

                                            // Add the followup to the datatable
                                            dt.row.add(response.record).draw(false, function(){

                                                // Check if the callback is a function
                                                if(typeof callback === "function"){
                                                    callback(response.record);
                                                }
                                            });
                                        } else {

                                            // Check if the callback is a function
                                            if(typeof callback === "function"){
                                                callback(response.record);
                                            }
                                        }

                                        // Close the modal
                                        modal.hide();

                                        // Open the task if the followup is a Call
                                        if(response.record.category === 'Call'){
                                            TaskModal(response.record.task.id);
                                        }
                                    }
                                });
                            },
                        },
                    },
                    function(form,component){
                        FollowupForm(form,contacts,fields,componentModal);
                        modal.show();
                    },
                );
            },
        );
    }

    // Retrieve the target
    function getTarget(){

        // Create a promise
        return new Promise((resolve, reject) => {

            // Try & Catch
            try {

                // Ajax Request
                $.ajax({
                    url: '/api/'+fields.targetTable+'/fetch?id='+fields.targetId,
                    headers: {'X-CSRF-Authorization': CSRF_KEY},
                    type: 'GET',dataType: 'json',
                    success: function(response) {

                        // Create contacts
                        createContact([response.record], function(){

                            // Resolve the promise
                            resolve();
                        });
                    },
                });
            } catch (error) {

                // Reject the promise
                reject(error);
            }
        });
    }

    // Retrieve the contacts
    function getContacts(){

        // Create a promise
        return new Promise((resolve, reject) => {

            // Try & Catch
            try {

                // Ajax Request
                $.ajax({
                    url: '/api/contacts/fetchAll',
                    headers: {'X-CSRF-Authorization': CSRF_KEY},
                    type: 'POST',dataType: 'json',
                    data: {
                        conditions: [
                            {key: 'targetTable', operator: '=', value: fields.targetTable},
                            {key: 'targetId', operator: '=', value: fields.targetId},
                            {key: 'isArchived', operator: '<>', value: 1},
                        ]
                    },
                    success: function(response) {

                        // Create contacts
                        createContact(response.records, function(){

                            // Resolve the promise
                            resolve();
                        });
                    },
                });
            } catch (error) {

                // Reject the promise
                reject(error);
            }
        });
    }

    // Execute the promises sequentially
    (async function run() {
        try {

            // Execute each steps sequentially
            await getTarget();
            await getContacts();

            // At this point, all awaited promises above have resolved (no errors).
            createModal();
        } catch (err) {
            console.error("An error occurred while creating the followup modal:", err);
        }
    })();
};
const FollowupModalArchive = function(followup, table, row){

    // Create a modal
    builder.Component(
        "modal",
        null,
        {
            onEnter: false,
            destroy: true,
            icon: "archive",
            title: builder.Locale.get("Are you sure you?"),
            body: builder.Locale.get("Your are about to archive this follow-up. Are you sure you want to continue?"),
            cancel: false,
            submit: true,
            callback: {
                submit: function(element,modal){

                    // Create a spinner animate-rotate
                    var spinner = $(document.createElement('div')).attr({
                        "class": "animate-rotate rounded-circle border border-secondary border-4 d-none",
                        "style": "width: 96px; height: 96px; border-top-color: var(--bs-primary)!important;",
                    }).appendTo(element);

                    // Hide the dialog
                    element.dialog.addClass('opacity-0');

                    // Setup a spinner while waiting for the modal to be submitted
                    setTimeout(() => {

                        // Hide the dialog
                        element.dialog.hide();

                        // Add flex to the modal
                        element.addClass('d-flex align-items-center justify-content-center');

                        // Show the spinner
                        spinner.removeClass('d-none');

                        // AJAX Request
                        $.ajax({
                            url: '/api/followups/archive?id='+followup.id,
                            type: 'GET',dataType: 'json',
                            success: function(response) {

                                // Remove the item from the list
                                table.delete(row);

                                // Hide the modal
                                modal.hide();
                            }
                        });
                    }, 300);
                },
            },
        },
        function(modal,component){

            // Save the component
            const componentModal = component;

            // Style the modal
            component.addClass('modal-dark');
            component.footer.submit.addClass('btn-dark').removeClass('btn-link').attr({
                "style": "border-bottom-right-radius: var(--bs-modal-inner-border-radius) !important;border-bottom-left-radius: var(--bs-modal-inner-border-radius) !important;",
            }).text(builder.Locale.get('Archive'));
            component.footer.submit.icon = $(document.createElement('i')).addClass('bi bi-archive me-1').prependTo(component.footer.submit);

            // Open the modal
            modal.show();
        },
    );
};
const FollowupsTable = function(category, followups, container, defaults = {}, callback = null){

    // Set Actions
    var actions = {
        details:{
            label:'Details',
            icon:'eye',
            action:function(event, table, dt, node, row, data){
                TaskModal(data.task.id);
            }
        },
        archive:{
            label:'Archive',
            icon:'archive',
            action:function(event, table, dt, node, row, data){
                FollowupModalArchive(data, table, row);
            }
        },
    };

    // Set Buttons
    var buttons = [
        {
            className : 'btn-success',
            init: function (dt, node){
                $(node).removeClass('btn-secondary');
            },
            text: '<i class="bi bi-plus-lg"></i>',
            action:function(e, dt, node, config){
                FollowupModalCreate(defaults,dt);
            },
        }
    ];

    // Column Definitions
    var columnDefs = [
        { target: 0, visible: false, title: builder.Locale.get('ID'), name: 'id', data: 'id', render: function(data, type, row) {
            var object = $(document.createElement('span'))
                .addClass('my-2')
                .text(data)
            return object.prop('outerHTML');
        }},
        { target: 1, visible: true, title: builder.Locale.get('Contact'), name: 'contact', data: 'contact', render: function(data, type, row) {
            var object = $(document.createElement('span'))
                .addClass('my-2')
                .text(row.vcard.name)
            return object.prop('outerHTML');
        }},
        { target: 2, visible: true, title: builder.Locale.get('Status'), name: 'status', data: 'status', render: function(data, type, row) {
            if(row.task.process === null || typeof row.task.process[row.task.progress] === "undefined") {
                return '<h5><span class="badge text-bg-success" data-type="status" data-task="'+row.task.id+'"><i class="me-1 bi bi-asterisk"></i>'+builder.Locale.get('New')+'</span></h5>';
            } else {
                return '<h5><span class="badge text-bg-'+row.task.process[row.task.progress].color+'" data-type="status" data-task="'+row.task.id+'"><i class="me-1 bi bi-'+row.task.process[row.task.progress].icon+'"></i>'+row.task.process[row.task.progress].name+'</span></h5>';
            }
        }},
        { target: 3, visible: false, title: builder.Locale.get('Priority'), name: 'priority', data: 'priority', render: function(data, type, row) {
            let color = ['secondary','primary','warning','orange','danger'];
            let name = ['Low','Normal','High','Urgent','Critical'];
            let icon = ['exclamation-triangle','info-circle','exclamation-circle','exclamation-diamond','exclamation-square'];
            return '<h5><span class="badge text-bg-'+color[row.task.priority]+'" data-type="priority" data-task="'+row.task.id+'"><i class="me-1 bi bi-'+icon[row.task.priority]+'"></i>'+builder.Locale.get(name[row.task.priority])+'</span></h5>';
        }},
        { target: 4, visible: true, title: builder.Locale.get('Assigned To'), name: 'assignedTo', data: 'assignedTo', render: function(data, type, row) {

            // If no users
            if(data.username == null || data.username == ''){
                return '';
            }

            // Create element
            var element = $(document.createElement('div')).addClass('d-flex flex-column');

            // Create Badge
            var object = $(document.createElement('span'))
                .addClass('d-flex align-items-center my-1')
                .attr('data-bs-toggle','tooltip')
                .attr('data-bs-placement','top')
                .attr('title',data.username)
                .attr('data-bs-title',data.username)
                .text(data.username);

            // Create avatar
            var avatar = $(document.createElement('img'))
                .addClass('rounded-circle me-1')
                .attr('alt',data.username)
                .css({
                    width: '32px',
                    height: '32px',
                })
                .attr('src','/avatar?username='+data.username)
                .prependTo(object);

            // Append to element
            object.appendTo(element);

            // Return element
            return element.prop('outerHTML');
        }},
        { target: 5, visible: true, title: builder.Locale.get('Due'), name: 'due', data: 'due', render: function(data, type, row) {
            var object = $(document.createElement('button')).attr({
                'data-id': row.id,
                'data-type': 'due',
                'data-bs-toggle': 'tooltip',
                'data-bs-placement': 'top',
                'title': row.task.due,
                'class': 'btn btn-sm btn-secondary cursor-default',
            });
            object.icon = $(document.createElement('i')).addClass('bi bi-clock me-1').prependTo(object);
            object.ago = $(document.createElement('time')).attr({
                'datetime': row.task.due,
                'class': 'cursor-default',
            }).text(row.task.due).appendTo(object);
            setInterval(function(){
                $('[data-type="followups"] button[data-type="due"][data-id="'+row.id+'"]').each(function(){
                    $(this).tooltip();
                });
            }, 100);
            return object.prop('outerHTML');
        }},
    ];
    if(category === 'Call'){
        columnDefs[5].visible = false;
    }

    // Create the table
    builder.Component(
        "table",
        container,
        {
            class: {
                buttons: "px-4 pt-4",
                table: "border-top",
                footer: "px-4 pt-2 pb-4",
            },
            showButtonsLabel: false,
            selectTools:false,
            actions:actions,
            datatable:{
                columnDefs:columnDefs,
                buttons:buttons,
                order: [[5, 'desc']],
            },
            dblclick:function(event, table, dt, node, data){
                actions.details.action(event, table, dt, node, null, data);
            },
        },
        function(table,component){
            component.attr({
                "data-type": "followups",
            })
            for(const [key, record] of Object.entries(followups ?? [])){
                if(record.category === category){
                    table.add(record);
                }
            }
        },
    );
};

// Create a followup
function process_function_FollowupCreate(task, value, callback = null){
    builder.Widget('followups',{render:false,type:value,targetTable:task.root.targetTable,targetId:task.root.targetId}).create(function(response){
        if(typeof callback === "function"){
            callback(task, value, response);
        }
    });
};
function process_meta_FollowupCreate(key = null){
    const metadata = {
        label: "Create a Followup",
        description: "Create a Followup",
        placeholder: "Select an option",
        type: "select",
        options: [
            {text: "Call", id: "Call"},
            {text: "Callback", id: "Callback"},
            {text: "Appointment", id: "Appointment"},
        ],
    };
    return metadata[key] ? metadata[key] : metadata;
}
