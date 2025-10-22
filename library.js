builder.add('widgets','followups', class extends builder.ComponentClass {

    #count = 0;
    _datatable = null;
    #interval = null;

    _init(){
        this._properties = {
            class: {
                component: null,
            },
            data: {},
            type: null,
            targetTable: null,
            targetId: null,
            interval: 10000,
            autoStart: false,
            render: true,
            default: null,
            callback: {},
        };

        // Array of advance target tables
        this._advancedTables = ['clients','leads','importers'];
        this._advancedColumns = {'client':'clients','lead':'leads','importer':'importers','vcard':'vcards'};
    }

    config(options){

        // Set Self
        const self = this;

        // Execute parent config
        super.config(options);

        // Table Properties
        this._properties.class.buttons = 'followups-controls';
        this._properties.class.table = 'followups-table';
        this._properties.class.footer = 'followups-footer';
        this._properties.standardSearch = true;
        this._properties.advancedSearch = true;
        this._properties.showButtonsLabel = false;

        // Table Actions
        this._properties.actions = {
            details:{
                label:'Details',
                icon:'eye',
                action:function(event, table, dt, node, row, data){
                    self._builder.Widget('task',{data: data.task.id}).view();
                }
            },
            archive:{
                label:'Archive',
                icon:'archive',
                action:function(event, table, dt, node, row, data){
                    self._builder.Widget('task',{data: data.task.id}).archive(function(response){
                        self.datatable().delete(row);
                    });
                }
            },
        };

        // Datatable Properties
        this._properties.datatable = {};

        // Responsive
        this._properties.datatable.responsive = {
            breakpoints: [
                { name: 'xl', width: Infinity },
                { name: 'lg', width: 1400 },
                { name: 'md', width: 992 },
                { name: 'sm', width: 768 },
                { name: 'xs', width: 576 },
                { name: 'xxs', width: 0 }
            ]
        };

        // Set Buttons
        this._properties.datatable.buttons = [
            {
                className : 'btn-success',
                init: function (dt, node){
                    $(node).removeClass('btn-secondary');
                },
                text: '<i class="bi bi-plus-lg"></i>',
                action:function(e, dt, node, config){
                    self.create();
                },
            }
        ];

        // Set Column Definitions
        this._properties.datatable.columnDefs = [
            {
                targets: 0,
                visible: false,
                title: builder.Locale.get('ID'),
                name: 'id',
                data: 'id',
            },
            {
                targets: 1,
                visible: true,
                title: builder.Locale.get('Contact'),
                className: 'all',
                name: 'contact',
                data: 'vcard.name',
                defaultContent: '',
                responsivePriority: 1,
            },
            {
                targets: 2,
                visible: true,
                title: builder.Locale.get('Status'),
                className: 'min-md',
                name: 'status',
                data: 'task.progress',
                defaultContent: '',
                responsivePriority: 2,
            },
            {
                targets: 3,
                visible: false,
                title: builder.Locale.get('Priority'),
                className: 'min-md',
                name: 'priority',
                data: 'task.priority',
                defaultContent: 0,
                responsivePriority: 1100,
            },
            {
                targets: 4,
                visible: true,
                title: builder.Locale.get('Assigned To'),
                className: 'min-md',
                name: 'assignedTo',
                data: 'task.assignedTo.username',
                defaultContent: '',
                responsivePriority: 100,
            },
            {
                targets: 5,
                visible: true,
                title: builder.Locale.get('Due'),
                className: 'min-md',
                name: 'due',
                data: 'task.due',
                defaultContent: '',
                responsivePriority: 1000,
            },
        ];

        // Set Column Visibility
        if(this._properties.type === 'Call'){
            this._properties.datatable.columnDefs[5].visible = false;
        }

        // Set Column Order
        this._properties.datatable.order = [[5, 'asc']];

        // Setup Placeholder
        this._properties.datatable.initComplete = function(param) {
            $(param.nTableWrapper).find('.dataTables_filter input').attr({
                'placeholder': builder.Locale.get('Search...'),
            });
        };

        // Add Row Double Click Event
        this._properties.dblclick = function(event, table, dt, node, data){
            self._builder.Widget('task',{data: data.task.id}).view();
        };
    }

    _create(){

        // Set Self
        const self = this;

        // Check if the component should be rendered
        if(!this._properties.render){
            return;
        }

        // Create Component
        this._component = $(document.createElement('div')).attr({
            'id': 'followups' + this._id,
            'class': 'followups-feed',
            'data-type': 'followups',
        });
        this._component.id = this._component.attr('id');

        // Set Component Class
        if(this._properties.class.component){
            this._component.addClass(this._properties.class.component);
        }

        // Create the Table
        this._builder.Component(
            'datatable',
            this._component,
            this._properties,
            function(datatable, component){

                // Set _datatable
                self.datatable(datatable);

                // Add Records
                self.load(self._properties.data);

                // Check if autoStart is enabled
                if(self._properties.autoStart){

                    // Start
                    setTimeout(function(){
                        self.start();
                    }, self._properties.interval);
                }
            },
        );
    }

    datatable(datatable = null){
        if(datatable){
            this._datatable = datatable;
        }
        return this._datatable;
    }

    load(records = null){

        // Set Self
        const self = this;

        // Create a loader function
        const loader = function(records){
            self.datatable()._datatable.rows().every(function(rowIdx, tableLoop, rowLoop){
                if(typeof records[this.data()['id']] === 'undefined'){
                    self.datatable()._datatable.row(rowIdx).remove();
                }
            });
            for(const [key, record] of Object.entries(records)){
                self.add(record);
            }
            return self;
        };

        // Check if records are provided
        if(records !== null && Object.entries(records).length > 0){
            return loader(records);
        }

        // Retrieve Records
        API.endpoint('/followups/fetchAll').data({
            conditions: [
                {key: 'targetTable', operator: '=', value: this._properties.targetTable},
                {key: 'targetId', operator: '=', value: this._properties.targetId},
                {key: 'task.isArchived', operator: '<>', value: 1},
                {key: 'isArchived', operator: '<>', value: 1},
            ]
        }).execute(function(response){
            return loader(response.records);
        });

        return this;
    }

    start(){

        // Set Self
        const self = this;

        // Check if the interval is already set
        if(this.#interval){
            console.warn('Interval is already set, stopping the previous one.');
            clearInterval(this.#interval);
        }

        // Set the interval to check for changes
        this.#interval = setInterval(function(){
            self.load();
        }, this._properties.interval);
    }

    stop(){
        // Check if the interval is set
        if(this.#interval){
            clearInterval(this.#interval);
            this.#interval = null;
        } else {
            console.warn('No interval is currently set.');
        }
    }

    add(record){

        // Check if the component should be rendered
        if(!this._properties.render){
            return this;
        }

        // Check if the record type matches
        if(this._properties.type.toLowerCase() === (record.type ?? record.category).toLowerCase()){

            // Add Record
            this.datatable().add(record);
        }

        return this;
    }

    create(callback = null){

        // Set Self
        const self = this;

        // Create the Modal
        this._builder.Component(
            "modal",
            {
                onEnter: false,
                icon: (this._properties.type.toLowerCase() === 'meeting') ? "calendar-event" : "telephone",
                title: this._builder.Locale.get("Create a "+this._properties.type),
                color: 'success',
                size: "lg",
                callback: {
                    load: function(component, modal){
                        return new Promise((resolve, reject) => {
                            try {

                                // Set the parent
                                const parent = component.dialog;

                                // Initialize the options
                                const options = [];

                                // Create a function to create contacts from the records
                                function addOptions(records){
                                    for(const [key, contact] of Object.entries(records ?? {})){
                                        var id = contact.vcard.id ?? (contact.id ?? null);
                                        var name = contact.vcard.name ?? (contact.name ?? null);
                                        var title = contact.vcard.title ?? (contact.title ?? null);
                                        var text = name;
                                        if(title != null){
                                            text += ' - ' + contact.vcard.title;
                                        }
                                        if(id !== null && text !== null){
                                            options.push({id:contact.vcard.id,text:text});
                                        }
                                    }
                                }

                                // Ajax Request
                                API.endpoint('/'+self._properties.targetTable+'/fetch?id='+self._properties.targetId).execute(function(response){
                                    const target = response.record;
                                    addOptions([target]);

                                    // Initialize Promises Array
                                    const Promises = [];

                                    // Create a Promise to fetch contacts based on the targetTable and targetId
                                    Promises.push(new Promise((resolve, reject) => {

                                        // Ajax Request
                                        API.endpoint('/contacts/fetchAll').data({
                                            conditions: [
                                                {key: 'targetTable', operator: '=', value: self._properties.targetTable},
                                                {key: 'targetId', operator: '=', value: self._properties.targetId},
                                                {key: 'isArchived', operator: '<>', value: 1},
                                            ],
                                        }).suppress().execute(function(response){
                                            resolve(response.records ?? {});
                                        }, function(){
                                            resolve({});
                                        });
                                    }));

                                    // Check if the target table is in array
                                    if(self._advancedTables.includes(self._properties.targetTable)){

                                        // Loop through the advance target tables
                                        for(const [column, table] of Object.entries(self._advancedColumns)){

                                            // Skip if the table is the same as the target table
                                            if(table === self._properties.targetTable) continue;

                                            // Check if the target has the advance target table loaded
                                            if(typeof target[column] === 'undefined' || target[column] === null || typeof target[column]?.id === 'undefined' || target[column]?.id === null){
                                                continue;
                                            }

                                            // Add a Promise to fetch contacts based on the advance targetTable and targetId
                                            Promises.push(new Promise((resolve, reject) => {

                                                // Ajax Request
                                                API.endpoint('/contacts/fetchAll').data({
                                                    conditions: [
                                                        {key: 'targetTable', operator: '=', value: table},
                                                        {key: 'targetId', operator: '=', value: target[column]?.id ?? null},
                                                        {key: 'isArchived', operator: '<>', value: 1},
                                                    ],
                                                }).suppress().execute(function(response){
                                                    resolve(response.records ?? {});
                                                }, function(){
                                                    resolve({});
                                                });
                                            }));
                                        }
                                    }

                                    // Execute all Promises and stop when one of them finds a matching contact
                                    Promise.all(Promises).then(results => {

                                        // Loop through the results and add options
                                        for(const records of results){
                                            addOptions(records);
                                        }

                                        // Create the Form
                                        self._builder.Utility(
                                            'form',
                                            component.body,
                                            {
                                                class:{
                                                    component: 'row row-cols-1 row-cols-md-2 g-3',
                                                },
                                                callback: {
                                                    val: function(values){

                                                        // Set the default values
                                                        values.category = self._properties.type;
                                                        values.targetTable = self._properties.targetTable;
                                                        values.targetId = self._properties.targetId;
                                                        values.due = new Date().toISOString().slice(0, 19).replace('T', ' ');

                                                        // Check if the followup is a Call
                                                        if(self._properties.type.toLowerCase() !== 'call'){

                                                            // Set the date and time
                                                            values.date = values.date || new Date().toISOString().slice(0, 10);
                                                            values.time = values.time || new Date().toISOString().slice(11, 16);

                                                            // Combine date and time into due
                                                            values.due = values.date + ' ' + values.time;

                                                            // Remove date and time from values
                                                            delete values.date;
                                                            delete values.time;
                                                        }

                                                        // Return the values
                                                        return values;
                                                    },
                                                    submit: function(form){

                                                        // Show the modal spinner
                                                        modal.spinner(true);

                                                        // Create the followup
                                                        API.endpoint('/followups/create').data(form.val()).execute(function(response){

                                                            // Add the Followup
                                                            self.add(response.record);

                                                            // Execute the callback
                                                            if(typeof callback === 'function'){
                                                                callback(response);
                                                            }

                                                            // Close the modal
                                                            modal.hide();

                                                            // Open the task if the followup is a Call
                                                            if(self._properties.type.toLowerCase() === 'call'){
                                                                self._builder.Widget('task',{data: response.record.task.id}).view();
                                                            }
                                                        },function(){
                                                            modal.hide();
                                                        });
                                                    },
                                                }
                                            },
                                            function(form,component){

                                                // Add event listener on the modal submit button
                                                parent.content.footer.submit.click(function(e){
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    form.submit();
                                                });

                                                // vcard
                                                form.add(
                                                    'select2',
                                                    {
                                                        name: 'vcard',
                                                        label: self._builder.Locale.get('Contact'),
                                                        placeholder: self._builder.Locale.get('Select a Contact'),
                                                        options: options,
                                                        value: self._properties.default,
                                                        required: true,
                                                        class: {
                                                            component: 'col-12',
                                                            label: 'text-bg-primary',
                                                        },
                                                    }
                                                );

                                                // date
                                                if(self._properties.type.toLowerCase() !== 'call'){
                                                    form.add(
                                                        'date',
                                                        {
                                                            name: 'date',
                                                            label: self._builder.Locale.get('Date'),
                                                            placeholder: self._builder.Locale.get('Enter a Date'),
                                                            required: true,
                                                            class: {
                                                                component: 'col-12 col-md-6',
                                                                label: 'text-bg-primary',
                                                            },
                                                        }
                                                    );
                                                }

                                                // time
                                                if(self._properties.type.toLowerCase() !== 'call'){
                                                    form.add(
                                                        'time',
                                                        {
                                                            name: 'time',
                                                            label: self._builder.Locale.get('Time'),
                                                            placeholder: self._builder.Locale.get('Enter a Time'),
                                                            class: {
                                                                component: 'col-12 col-md-6',
                                                            },
                                                        }
                                                    );
                                                }

                                                // Resolve the promise
                                                resolve();
                                            },
                                        );
                                    });
                                },function(xhr, status, error){
                                    modal.hide();
                                    reject(error);
                                });
                            } catch(e) { reject(e); }
                        });
                    },
                },
            },
            function(modal,component){

                // Show the modal
                modal.show();
            },
        );
    }
});
