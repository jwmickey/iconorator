<?php

namespace Iconorator\Service;

class Set
{
    protected $_path = null;
    protected $_sets = array();
    protected $_cache = null;

    public function __construct($pathToIconSets)
    {
        $path = realpath($pathToIconSets);
        if (!$path) {
            throw new Exception("Invalid path: $pathToIconSets");
        }

        $this->_path = $path;

        $dirs = scandir($path);
        array_shift($dirs);   // skip .
        array_shift($dirs);   // skip ..

        foreach ($dirs as $dir) {
            if (is_readable($path . '/' . $dir . '/config.json')) {
                $set = json_decode(file_get_contents($path . '/' . $dir . '/config.json'));
                $sets[$dir] = $set;
            }
        }

        $this->_sets = $sets;
    }

    public function setCache($cache)
    {
        $this->_cache = $cache;
    }

    public function getAllSets()
    {
        return $this->_sets;
    }

    public function getSetBySlug($slug)
    {
        if (!array_key_exists($slug, $this->getAllSets())) {
            return null;
        }

        $set = $this->_sets[$slug];
        $iconFile = $this->_path . '/'. $slug . '/icons.json';

        if (is_readable($iconFile)) {
            $json = json_decode(file_get_contents($iconFile));
            $set->icons = $json->icons;
        }

        return $set;
    }

}
