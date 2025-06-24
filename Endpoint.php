<?php

/**
 * Core Framework - FollowupsEndpoint
 *
 * @license    MIT (https://mit-license.org/)
 * @author     Louis Ouellet <louis@laswitchtech.com>
 */

// Import additionnal class into the global namespace
use \LaswitchTech\Core\Abstracts\Endpoint;

class FollowupsEndpoint extends Endpoint {

    /**
     * Constructor
     */
    public function __construct()
    {

        // Call Parent Constructor
        parent::__construct();

        // Retrieve the namespace
        $namespace = $this->Request->getNamespace();

        // Set Global access
        $this->Public = false;
        $this->Level = 1;

        // Set Properties
        switch($namespace){
            case "/followups/create":
                $this->Level = 2;
                break;
            case "/followups/archive":
            case "/followups/recover":
                $this->Level = 4;
                break;
        }
    }

    /**
     * Create a Followup
     */
    public function createAction(): array
    {
        // Import Global Variables
        global $CSRF, $DATABASE;

        // Set the default message
        $message = ["status" => 200, "message" => "OK", "data" => []];

        // Check the request method
        if($this->Request->getMethod() == "POST"){
            $message["data"]["CSRF"] = [
                "token" => $CSRF->token(),
                "key" => $CSRF->key()
            ];
        }

        // Check if the Note is accessible
        if($message['status'] == 200){

            // Check the request method
            if($this->Request->getMethod() == "POST"){

                // Retrieve the parameters
                $parameters = $this->Request->getParams('REQUEST');

                // Sanitize the parameters
                foreach($parameters as $key => $value){
                    if(empty($value)){
                        unset($parameters[$key]);
                    } else {
                        if(!in_array($key,['targetTable','targetId'])){
                            if(in_array($key,['tags','industries']) && !is_array($value)){
                                $value = json_decode($value, true);
                                $parameters[$key] = $value;
                            }
                            if(!is_array($value)){
                                $parameters[$key] = ucwords(strtolower($value));
                            } else {
                                foreach($value as $k => $v){
                                    $parameters[$key][$k] = ucwords(strtolower($v));
                                }
                            }
                        }
                    }
                }

                // Set Required Fields
                $required = ['category','vcard','due','targetTable','targetId'];

                // Set Optional Fields
                $optional = [];

                // Set Unique Fields
                $unique = ['id','created','modified','owner','organization'];

                // Check if all required fields are set
                if(count(array_intersect_key(array_flip($required), $parameters)) == count($required)){

                    // Initialize the Events
                    $message['data']['events'] = [];

                    // Retrieve the lead process
                    $process = $this->Model->Process->get($parameters['category']);

                    // Retrieve the user's username and vCard
                    $owner = $this->Auth->user()->username;
                    $assignedTo = $this->Auth->user()->id;
                    $organization = $this->Auth->user()->organization()->id;
                    $vCard = $this->Auth->user()->vcard();

                    // Initialize the vCard
                    $vcard = $this->Model->Vcards->get($parameters['vcard']);

                    // Create a Lead
                    $followup = [
                        'category' => $parameters['category'],
                        'owner' => $owner,
                        'assignedTo' => $assignedTo,
                        'organization' => $organization,
                        'vcard' => $vcard['id'],
                        'targetTable' => $parameters['targetTable'],
                        'targetId' => $parameters['targetId'],
                    ];
                    $followupId = $this->Model->Followups->create($followup);

                    // Create a Task
                    $task = [
                        'label' => '',
                        'category' => $parameters['category'],
                        'progress' => 0,
                        'scale' => count($process['process']),
                        'color' => 'primary',
                        'link' => '/plugin/tasks?id=',
                        'owner' => $owner,
                        'assignedTo' => $assignedTo,
                        'process' => $process['process'],
                        'due' => $parameters['due'],
                        'isActive' => 1,
                        'targetTable' => "followups",
                        'targetId' => $followupId,
                    ];

                    // Retrieve the target object
                    $Query = $DATABASE->query()
                        ->table($parameters['targetTable'])
                        ->select('*')
                        ->where('id',$parameters['targetId'])
                        ->where('id',9999,'<>')
                        ->limit(1);
                    $target = $Query->fetch()[0] ?? [];

                    // Check if the target object contains a vCard
                    if(isset($target['vcard'])){
                        $target['vcard'] = $this->Model->Vcards->get($target['vcard']);
                        $task['label'] = '<vcard success>'.$target['vcard']['id'].':'.$target['vcard']['name'].'</vcard>'.$task['label'];
                    }

                    // Set the Task Label
                    if($vcard['id'] != $target['vcard']['id']){
                        $task['label'] .= '<vcard>' . $vcard['id'] . ':' . $vcard['name'] . (!empty($vcard['title']) ? ' - ' . $vcard['title'] : '') . '</vcard>';
                    }
                    $task['label'] .= '<tel>'.$vcard['phone'].'</tel>';

                    // Create the Task
                    $taskId = $this->Model->Tasks->create($task);

                    // Update the Task link
                    switch($parameters['category']){
                        case 'Lead':
                        case 'Client':
                        case 'Call':
                        case 'Callback':
                        case 'Appointment':
                            $task['link'] = '/plugin/'.$parameters['targetTable'].'/details?id='.$parameters['targetId'];
                            if(isset($target['vcard'])){
                                $task['link'] .= '&name='.urlencode($target['vcard']['name']);
                            }
                            break;
                        default:
                            $task['link'] = '/plugin/tasks?id='.$taskId;
                            break;
                    }
                    $affectedRows = $this->Model->Tasks->update($taskId, ['link' => $task['link']]);

                    // Update the Follow-up
                    $affectedRows = $this->Model->Followups->update($followupId, ['task' => $taskId]);

                    // Create the related events
                    $message['data']['events'][] = $this->Model->Event->create($owner, 'tasks', $taskId, $parameters['category'], 'New Task Created for <vcard>'.$vCard['id'].':'.$this->Auth->user()->username.'</vcard>', '/plugin/tasks/index?id='.$taskId);
                    $message['data']['events'][] = $this->Model->Event->create($owner, 'vcards', $vcard['id'], $parameters['category'], 'New '.$parameters['category'].' schedule with <vcard>'.$vcard['id'].':'.$vcard['name'].'</vcard> by <vcard>'.$vCard['id'].':'.$this->Auth->user()->username.'</vcard>', '/plugin/tasks/index?id='.$taskId);
                    $message['data']['events'][] = $this->Model->Event->create($owner, 'followups', $followupId, $parameters['category'], 'New '.$parameters['category'].' schedule with <vcard>'.$vcard['id'].':'.$vcard['name'].'</vcard> by <vcard>'.$vCard['id'].':'.$this->Auth->user()->username.'</vcard>', '/plugin/tasks/index?id='.$taskId);

                    // Check if a target object has been created
                    if($taskId && $followupId){

                        // Retrieve the final lead
                        $message['data']['record'] = $this->Model->Followups->get($followupId);

                        if(isset($parameters['targetTable']) && isset($parameters['targetId'])){

                            // Create the an event
                            $message['data']['events'][] = $this->Model->Event->create($owner, $parameters['targetTable'], $parameters['targetId'], $parameters['category'], 'New '.$parameters['category'].' schedule with <vcard>'.$vcard['id'].':'.$vcard['name'].'</vcard> by <vcard>'.$vCard['id'].':'.$this->Auth->user()->username.'</vcard>');
                        }
                    } else {
                        $message['status'] = 500;
                        $message['message'] = "Internal Server Error";
                        $message['data']['error'] = "The followup could not be created.";
                    }
                } else {
                    $message['status'] = 400;
                    $message['message'] = "Bad Request";
                    $message['data']['error'] = "Some required fields are missing.";
                }
            } else {
                $message = ["status" => 405, "message" => "Method Not Allowed", "data" => "The method is not allowed for the requested URL."];
            }
        }

        return $message;
    }

    /**
     * Archive a Follow-Up
     */
    public function archiveAction(): array
    {
        // Set the default message
        $message = ["status" => 200, "message" => "OK", "data" => []];

        // Retrieve the Follow-Up
        $followup = $this->Model->Followups->get(intval($this->Request->getParams('GET','id')));

        // Check if the Follow-Up is accessible
        if(empty($followup)){
            $message = ["status" => 404, "message" => "Not Found", "data" => "Could not find the requested followup."];
        } else {
            if($followup['organization']['id'] != $this->Auth->user()->organization()->id){
                $message = ["status" => 403, "message" => "Forbidden", "data" => "You are not allowed to access this followup."];
            }
        }

        // Check if the Note is accessible
        if($message['status'] == 200){

            // Check the request method
            if($this->Request->getMethod() == "GET"){

                // Update the Follow-Up
                $this->Model->Followups->update($followup['id'], ["isArchived" => 1]);

                // Update the Task
                $this->Model->Tasks->update($followup['task']['id'], ["isActive" => 0]);

                // Retrieve the Updated Follow-Up
                $message["data"]["record"] = $this->Model->Followups->get($followup['id']);
            } else {
                $message = ["status" => 400, "message" => "Bad Request", "data" => "Invalid Request Method"];
            }
        }

        return $message;
    }

    /**
     * Recover a Follow-Up
     */
    public function recoverAction(): array
    {
        // Set the default message
        $message = ["status" => 200, "message" => "OK", "data" => []];

        // Retrieve the Follow-Up
        $followup = $this->Model->Followups->get(intval($this->Request->getParams('GET','id')));

        // Check if the Follow-Up is accessible
        if(empty($followup)){
            $message = ["status" => 404, "message" => "Not Found", "data" => "Could not find the requested followup."];
        } else {
            if($followup['organization']['id'] != $this->Auth->user()->organization()->id){
                $message = ["status" => 403, "message" => "Forbidden", "data" => "You are not allowed to access this followup."];
            }
        }

        // Check if the Note is accessible
        if($message['status'] == 200){

            // Check the request method
            if($this->Request->getMethod() == "GET"){

                // Update the Follow-Up
                $affectedRows = $this->Model->Followups->update($followup['id'], ["isArchived" => 0]);

                // Retrieve the Updated Follow-Up
                $message["data"]["record"] = $this->Model->Followups->get($followup['id']);
            } else {
                $message = ["status" => 400, "message" => "Bad Request", "data" => "Invalid Request Method"];
            }
        }

        return $message;
    }
}
