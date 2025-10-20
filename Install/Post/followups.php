<?php

require_once realpath(__DIR__ . '/../../Model.php');

class FollowupsPostModel extends FollowupsModel {

    /**
     * Post process a record
     *
     * @param array $record
     * @return array
     */
    public function post($record): array
    {
        // Check if the record ID is below 9999
        if($record['id'] <= 9999) return [];

        // Loop through the record
        foreach($record as $key => $value){

            // Handle specific fields
            switch($key){
                case 'assignedTo':
                    unset($record[$key]);
                    break;
                default:
                    break;
            }
        }

        // Return the record
        return $record;
    }
}
