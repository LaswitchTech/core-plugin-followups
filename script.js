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

// Has a followup
function process_function_hasFollowup(task, value, callback = null){

    // Loop through the followups list
    if(typeof task.target !== 'undefined'){

        // Ajax Request
        API.endpoint('/followups/fetchAll').data({
            conditions: [
                {key: 'category', operator: '=', value: value},
                {key: 'targetTable', operator: '=', value: task.targetTable},
                {key: 'targetId', operator: '=', value: task.targetId},
                {key: 'isArchived', operator: '<>', value: 1},
                {key: 'task.isArchived', operator: '<>', value: 1},
            ]
        }).execute(function(response){
            if(Object.entries(response.records ?? {}).length > 0){
                if(typeof callback === "function"){
                    callback(task, value, response);
                }
            }
        });
    }
};
function process_meta_hasFollowup(key = null){
    const metadata = {
        label: "Has a Followup",
        description: "Check if target has a Followup",
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

// Has a followup then create
function process_function_hasFollowupCreate(task, value, callback = null){

    // Loop through the followups list
    if(typeof task.target !== 'undefined'){

        // Ajax Request
        API.endpoint('/followups/fetchAll').data({
            conditions: [
                {key: 'category', operator: '=', value: value},
                {key: 'targetTable', operator: '=', value: task.targetTable},
                {key: 'targetId', operator: '=', value: task.targetId},
                {key: 'isArchived', operator: '<>', value: 1},
                {key: 'task.isArchived', operator: '<>', value: 1},
            ]
        }).execute(function(response){
            if(Object.entries(response.records ?? {}).length <= 0){
                process_function_FollowupCreate(task, value, callback);
            } else {
                if(typeof callback === "function"){
                    callback(task, value, response);
                }
            }
        });
    }
};
function process_meta_hasFollowupCreate(key = null){
    const metadata = {
        label: "Has a Followup then Create",
        description: "Check if target has a Followup, create if none",
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
