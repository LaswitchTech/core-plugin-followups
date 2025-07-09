<?php

// Import additionnal class into the global namespace
use \LaswitchTech\Core\Base\BaseEndpoint;

class FollowupsEndpoint extends BaseEndpoint {

    /**
     * Constructor
     */
    public function __construct()
    {
        // Call the parent constructor
        parent::__construct();

        // Initialize the Endpoint
        $this->init('followups');

        // Set Properties
        $this->required = ['category','vcard','due','targetTable','targetId'];
        $this->optional = [];
    }

    /**
     * Create a record
     */
    public function createAction(): array
    {
        // Call the parent constructor
        $message = parent::createAction();

        // Check if the record is accessible
        if($message['status'] == 200){

            // Retrieve the parameters
            $parameters = $message['data']['parameters'];

            // Initialize the fields array
            $fields = ["assignedTo" => $this->Auth->user()->id];

            // Initialize the vCard
            $message['data']['record']['vcard'] = $this->Model->Vcards->fetch($message['data']['record']['vcard']['id']);

            // Check if the Event Plugin is accessible
            if($this->Helper->Core->isInstalled('event')){

                // Initialize the Events
                $message['data']['event'] = [];

                // Setup a new event
                $event = [
                    'category' => 'Followup',
                    'message' => 'New Followup Created by <vcard>'.$this->Auth->user()->vcard['id'].':'.$this->Auth->user()->username.'</vcard>',
                    'icon' => 'circle',
                    'color' => 'secondary',
                    'link' => '/plugin/'.$message['data']['record']['targetTable'].'/details?id='.$message['data']['record']['targetId'],
                    'targetTable' => 'followups',
                    'targetId' => $message['data']['record']['id'],
                ];

                // Create the event
                $message['data']['event'][] = $this->Model->Event->create($event);

                // Setup a new event for the target
                $event['targetTable'] = $message['data']['record']['targetTable'];
                $event['targetId'] = $message['data']['record']['targetId'];

                // Create the event
                $message['data']['event'][] = $this->Model->Event->create($event);

                // Check if the vCards Plugin is accessible
                if($this->Helper->Core->isInstalled('vcards')){

                    // Setup a new event for the vcard
                    $event['targetTable'] = 'vcards';
                    $event['targetId'] = $message['data']['record']['vcard']['id'];

                    // Create the event
                    $message['data']['event'][] = $this->Model->Event->create($event);
                }
            }

            // Check if the Tasks Plugin is accessible
            if($this->Helper->Core->isInstalled('tasks')){

                // Initialize the record
                $record = [];

                // Retrieve the followup process
                $process = $this->Model->Process->fetchByTable('followups', $parameters['category']);
                $record['process'] = $process['process'];

                // Complete the task record
                $record['label'] = '';
                $record['category'] = $parameters['category'];
                $record['assignedTo'] = $this->Auth->user()->id;
                $record['due'] = $parameters['due'] ?? null;
                $record['progress'] = 0;
                $record['scale'] = count($record['process']);
                $record['color'] = 'primary';
                $record['link'] = '/plugin/'.$message['data']['record']['root']['targetTable'].'/details?id='.$message['data']['record']['root']['targetId'];
                $record['targetTable'] = 'followups';
                $record['targetId'] = $message['data']['record']['id'];

                // Check if the target object contains a vCard
                if(isset($message['data']['record']['target']) && isset($message['data']['record']['target']['vcard'])){
                    $message['data']['record']['target']['vcard'] = $this->Model->Vcards->fetch($message['data']['record']['target']['vcard']['id'] ?? $message['data']['record']['target']['vcard']);
                    $record['label'] = '<vcard success>'.$message['data']['record']['target']['vcard']['id'].':'.$message['data']['record']['target']['vcard']['name'].'</vcard>';
                }

                // Set the Task Label
                if($message['data']['record']['vcard']['id'] != $message['data']['record']['target']['vcard']['id']){
                    $record['label'] .= '<vcard>' . $message['data']['record']['vcard']['id'] . ':' . $message['data']['record']['vcard']['name'] . (!empty($message['data']['record']['vcard']['title']) ? ' - ' . $message['data']['record']['vcard']['title'] : '') . '</vcard>';
                }
                $record['label'] .= '<tel>'.$message['data']['record']['vcard']['phone'].'</tel>';

                // Create the task
                // var_dump($record);
                $fields['task'] = $this->Model->Tasks->create($record);

                // Check if the Event Plugin is accessible
                if($this->Helper->Core->isInstalled('event')){

                    // Setup a new event
                    $event = [
                        'category' => 'Task',
                        'message' => 'New Task Created for <vcard>'.$message['data']['record']['vcard']['id'].':'.$message['data']['record']['vcard']['name'].'</vcard> by <vcard>'.$this->Auth->user()->vcard['id'].':'.$this->Auth->user()->username.'</vcard>',
                        'icon' => 'circle',
                        'color' => 'secondary',
                        'link' => $record['link'],
                        'targetTable' => 'followups',
                        'targetId' => $message['data']['record']['id'],
                    ];

                    // Create the event
                    $message['data']['event'][] = $this->Model->Event->create($event);

                    // Setup a new event for the root object
                    $event['targetTable'] = $message['data']['record']['root']['targetTable'];
                    $event['targetId'] = $message['data']['record']['root']['targetId'];

                    // Create the event
                    $message['data']['event'][] = $this->Model->Event->create($event);

                    // Setup a new event for the task
                    $event['link'] = '/plugin/tasks/index?id='.$fields['task'];
                    $event['targetTable'] = 'tasks';
                    $event['targetId'] = $fields['task'];

                    // Create the event
                    $message['data']['event'][] = $this->Model->Event->create($event);
                }
            }

            // Check if $fields is empty
            if(!empty($fields)){
                $affectedRows = $this->Model->{$this->name}->update($message['data']['record']['id'], $fields);

                // Check if we send out the notification
                if($affectedRows){

                    // Retrieve the updated record
                    $message['data']['record'] = $this->Model->{$this->name}->fetch($message['data']['record']['id']);
                }
            }
        }

        // Return the message
        return $message;
    }

    /**
     * Update a record
     */
    public function updateAction(): array
    {
        // Call the parent constructor
        $message = parent::updateAction();

        // Check if the record is accessible
        if($message['status'] == 200){

            // Check if the Event Plugin is accessible
            if($this->Helper->Core->isInstalled('event')){

                // Initialize the Events
                $message['data']['event'] = [];

                // Setup a new event
                $event = [
                    'category' => 'Followup',
                    'message' => 'Followup Updated by <vcard>'.$this->Auth->user()->vcard['id'].':'.$this->Auth->user()->username.'</vcard>',
                    'icon' => 'circle',
                    'color' => 'secondary',
                    'link' => '/plugin/'.$message['data']['record']['targetTable'].'/details?id='.$message['data']['record']['targetId'],
                    'targetTable' => $message['data']['record']['targetTable'],
                    'targetId' => $message['data']['record']['targetId'],
                ];

                // Create the event
                $message['data']['event'][] = $this->Model->Event->create($event);
            }
        }

        // Return the message
        return $message;
    }

    /**
     * Delete a record
     */
    public function deleteAction(): array
    {
        // Call the parent constructor
        $message = parent::deleteAction();

        // Check if the record is accessible
        if($message['status'] == 200){

            // Check if the Event Plugin is accessible
            if($this->Helper->Core->isInstalled('event')){

                // Initialize the Events
                $message['data']['event'] = [];

                // Setup a new event
                $event = [
                    'category' => 'Followup',
                    'message' => 'Followup Deleted by <vcard>'.$this->Auth->user()->vcard['id'].':'.$this->Auth->user()->username.'</vcard>',
                    'icon' => 'circle',
                    'color' => 'secondary',
                    'link' => '/plugin/'.$message['data']['record']['targetTable'].'/details?id='.$message['data']['record']['targetId'],
                    'targetTable' => $message['data']['record']['targetTable'],
                    'targetId' => $message['data']['record']['targetId'],
                ];

                // Create the event
                $message['data']['event'][] = $this->Model->Event->create($event);
            }
        }

        // Return the message
        return $message;
    }

    /**
     * Archive a record
     */
    public function archiveAction(): array
    {
        // Call the parent constructor
        $message = parent::archiveAction();

        // Check if the record is accessible
        if($message['status'] == 200){

            // Check if the Event Plugin is accessible
            if($this->Helper->Core->isInstalled('event')){

                // Initialize the Events
                $message['data']['event'] = [];

                // Setup a new event
                $event = [
                    'category' => 'Followup',
                    'message' => 'Followup Archived by <vcard>'.$this->Auth->user()->vcard['id'].':'.$this->Auth->user()->username.'</vcard>',
                    'icon' => 'circle',
                    'color' => 'secondary',
                    'link' => '/plugin/'.$message['data']['record']['targetTable'].'/details?id='.$message['data']['record']['targetId'],
                    'targetTable' => $message['data']['record']['targetTable'],
                    'targetId' => $message['data']['record']['targetId'],
                ];

                // Create the event
                $message['data']['event'][] = $this->Model->Event->create($event);
            }
        }

        // Return the message
        return $message;
    }

    /**
     * Recover a record
     */
    public function recoverAction(): array
    {
        // Call the parent constructor
        $message = parent::recoverAction();

        // Check if the record is accessible
        if($message['status'] == 200){

            // Check if the Event Plugin is accessible
            if($this->Helper->Core->isInstalled('event')){

                // Initialize the Events
                $message['data']['event'] = [];

                // Setup a new event
                $event = [
                    'category' => 'Followup',
                    'message' => 'Followup Recovered by <vcard>'.$this->Auth->user()->vcard['id'].':'.$this->Auth->user()->username.'</vcard>',
                    'icon' => 'circle',
                    'color' => 'secondary',
                    'link' => '/plugin/'.$message['data']['record']['targetTable'].'/details?id='.$message['data']['record']['targetId'],
                    'targetTable' => $message['data']['record']['targetTable'],
                    'targetId' => $message['data']['record']['targetId'],
                ];

                // Create the event
                $message['data']['event'][] = $this->Model->Event->create($event);
            }
        }

        // Return the message
        return $message;
    }
}
