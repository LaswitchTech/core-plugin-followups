<?php

/**
 * Core Framework - FollowupsModel
 *
 * @license    MIT (https://mit-license.org/)
 * @author     Louis Ouellet <louis@laswitchtech.com>
 */

// Import additionnal class into the global namespace
use \LaswitchTech\Core\Abstracts\Model;

class FollowupsModel extends Model {

    /**
     * Create a new followup and return the id
     *
     * @param array $data
     * @return int
     */
    public function create(array $data): int
    {
        // Create the Query
        $Query = $this->Database->query()
            ->table('followups')
            ->insert($data);

        // Execute the Query
        $affectedRows = $Query->execute();

        // Execute the Query
        return $Query->lastId();
    }

    /**
     * Update a followup
     *
     * @param int $id
     * @param array $data
     * @return int
     */
    public function update(int $id, array $data): int
    {
        // Create the Query
        $Query = $this->Database->query()
            ->table('followups')
            ->update($data)
            ->where('id', $id);

        // Execute the Query
        return $Query->execute();
    }

    /**
     * Retrieve Followups List
     *
     * @param int $organization
     * @return array
     */
    public function list(int $organization): array
    {
        // Create the Query
        $Query = $this->Database->query()
            ->table('followups')
            ->select('*')
            ->join('owner', 'users', 'username')
            ->join('assignedTo', 'users', 'id')
            ->join('task', 'tasks', 'id')
            ->join('vcard', 'vcards', 'id')
            ->join('organization', 'organizations', 'id')
            ->filter()
            ->where('id', 9999, '<>')
            ->where('isArchived', 0)
            ->filter()
            ->where('organization', $organization);

        // Retrieve the Results
        $result = $Query->result();

        // Process Records
        foreach($result as $key => $record){

            // Decode JSON Fields
            $result[$key]['task']['process'] = json_decode($record['task']['process'] ?? '[]', true);
            $result[$key]['vcard']['tags'] = json_decode($record['vcard']['tags'] ?? '[]', true);
            $result[$key]['vcard']['industries'] = json_decode($record['vcard']['industries'] ?? '[]', true);
        }

        // Return the Results
        return $result;
    }

    /**
     * Retrieve Followup's Details
     *
     * @param int $id
     * @return array
     */
    public function get(int $id): array
    {
        // Create the Query
        $Query = $this->Database->query()
            ->table('followups')
            ->select('*')
            ->join('owner', 'users', 'username')
            ->join('assignedTo', 'users', 'id')
            ->join('task', 'tasks', 'id')
            ->join('vcard', 'vcards', 'id')
            ->join('organization', 'organizations', 'id')
            ->filter()
            ->where('id', 9999, '<>')
            ->where('isArchived', 0)
            ->filter()
            ->where('id', $id)
            ->limit(1);

        // Retrieve the Results
        $result = $Query->result();

        // Process Records
        foreach($result as $key => $record){

            // Decode JSON Fields
            $result[$key]['task']['process'] = json_decode($record['task']['process'] ?? '[]', true);
            $result[$key]['vcard']['tags'] = json_decode($record['vcard']['tags'] ?? '[]', true);
            $result[$key]['vcard']['industries'] = json_decode($record['vcard']['industries'] ?? '[]', true);
        }

        // Return the Results
        return $result[array_key_first($result)] ?? [];
    }
}
