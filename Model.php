<?php

// Import additionnal class into the global namespace
use \LaswitchTech\Core\Base\BaseModel;

class FollowupsModel extends BaseModel {

    /**
     * Constructor
     */
    public function __construct()
    {
        // Call the parent constructor
        parent::__construct();

        // Initialize the Model
        $this->init('followups');
    }

    /**
     * Process a record
     *
     * @param array $record
     * @return array
     */
    protected function process(array $record): array
    {
        // Call the parent constructor
        $record = parent::process($record);

        // Check if the record has a task
        if(array_key_exists('task', $record) && array_key_exists('process', $record['task'])){

            // Check if the process is a valid JSON string
            if(is_string($record['task']['process']) && $this->isJson($record['task']['process'])){

                // Decode the JSON value
                $record['task']['process'] = json_decode($record['task']['process'], true);
            }
        }

        // Check if the vcard exists in the record
        if(array_key_exists('vcard', $record)){

            // Check if the vcard has tags
            if(array_key_exists('tags', $record['vcard'])){

                // Check if the process is a valid JSON string
                if(is_string($record['vcard']['tags']) && $this->isJson($record['vcard']['tags'])){

                    // Decode the JSON value
                    $record['vcard']['tags'] = json_decode($record['vcard']['tags'], true);
                }
            }

            // Check if the vcard has industries
            if(array_key_exists('industries', $record['vcard'])){

                // Check if the process is a valid JSON string
                if(is_string($record['vcard']['industries']) && $this->isJson($record['vcard']['industries'])){

                    // Decode the JSON value
                    $record['vcard']['industries'] = json_decode($record['vcard']['industries'], true);
                }
            }
        }

        // Return the processed record
        return $record;
    }

    /**
     * Retrieve multiple records
     *
     * @param array $conditions
     * @return array
     */
    public function fetchAll(array $conditions = [], string $conjunction = 'AND'): array
    {
        // Create the Query
        $Query = $this->Database->query()
            ->table($this->table)
            ->select('*')
            ->join('owner', 'users', 'username')
            ->join('assignedTo', 'users', 'id')
            ->join('vcard', 'vcards', 'id')
            ->join('task', 'tasks', 'id')
            ->join('organization', 'organizations', 'id')
            ->filter()
            ->where('id', 9999, '<>')
            ->where('organization', $this->Auth->user()->organization()->id);

        // Check if the conditions are empty
        if(!empty($conditions)){

            // Add a Filter
            $Query->filter();

            // Add the Conditions
            foreach($conditions as $key => $condition){

                // Check if the key exists in the definition
                if(!array_key_exists($condition['key'], $this->definition)){

                    // Remove the key from the data
                    unset($conditions[$key]);
                    continue;
                }

                // Add the condition to the Query
                $Query->where($condition["key"], $condition["value"], $condition["operator"], $conjunction);
            }
        }

        // Retrieve the Results
        $records = $Query->fetch();

        // Loop through the records to process them
        foreach($records as $key => $record){

            // Overwrite the record with the processed one
            $records[$key] = $this->process($record);
        }

        // Return the Results
        return $records;
    }

    /**
     * Retrieve a single record
     *
     * @param int $id
     * @return array
     */
    public function fetch(int $id): array
    {
        // Create the Query
        $Query = $this->Database->query()
            ->table($this->table)
            ->select('*')
            ->join('owner', 'users', 'username')
            ->join('assignedTo', 'users', 'id')
            ->join('assignedTo.vcard', 'vcards', 'id')
            ->join('vcard', 'vcards', 'id')
            ->join('task', 'tasks', 'id')
            ->join('organization', 'organizations', 'id')
            ->join('organization.vcard', 'vcards', 'id')
            ->filter()
            ->where('id', 9999, '<>')
            ->filter()
            ->where($this->primary, $id)
            ->limit(1);

        // Retrieve the record
        $records = $Query->fetch();

        // Loop through the records to process them
        foreach($records as $key => $record){

            // Overwrite the record with the processed one
            $records[$key] = $this->process($record);
        }

        // Return the record or an empty array if not found
        return $records[array_key_first($records)] ?? [];
    }
}
