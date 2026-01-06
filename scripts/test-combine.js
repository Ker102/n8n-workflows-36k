
const groups = [
    [{name: 'A'}, {name: 'B'}],
    [{name: '1'}, {name: '2'}]
];

const combine = (arrays) => {
    return arrays.reduce((acc, curr) => 
        acc.flatMap(a => curr.map(b => [a, b].flat())), [[]]
    );
};

const combinations = combine(groups);
console.log(JSON.stringify(combinations, null, 2));
