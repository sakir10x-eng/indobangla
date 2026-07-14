<?php

namespace Marvel\GraphQL\Scalars;

use GraphQL\Type\Definition\ScalarType;
use GraphQL\Language\AST\StringValueNode;

class JSON extends ScalarType
{
    public $name = 'JSON';

    public function serialize($value)
    {
        return $value;
    }

    public function parseValue($value)
    {
        return json_decode($value, true);
    }

    public function parseLiteral($valueNode, array $variables = null)
    {
        if (!$valueNode instanceof StringValueNode) {
            return null;
        }

        return json_decode($valueNode->value, true);
    }
}