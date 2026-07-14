<?php
 
namespace Marvel\Database\Repositories;
 
use Marvel\Database\Models\CustomPage;
 
class CustomPageRepository extends BaseRepository
{
    /**
     * Configure the Model
     **/
    public function model()
    {
        return CustomPage::class;
    }
}