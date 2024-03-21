# Internet Object vs JSON Benchmarks

Compares the data size of Internet Object vs JSON output when serialized. To execute this benchmark, run the follwing code!

```sh
$ yarn start
```

You might see an output similar to the following when you run this.

```
For 1 Record(s)
===============
IO Data: 495
IO Data with Header: 671
JSON: 887
IO is 44.19% smaller than JSON!
IO with header is 24.34% smaller than JSON!

For 100 record(s)
=================
IO Data: 50862
IO Data with Header: 51038
JSON: 89963
IO is 43.46% smaller than JSON!
IO with header is 43.27% smaller than JSON!

For 1000 record(s)
==================
IO Data: 506234
IO Data with Header: 506410
JSON: 897235
IO is 43.58% smaller than JSON!
IO with header is 43.56% smaller than JSON!
```

> **Work in Progress:** While this benchmark is a good start, it is still a work in progress. We will be adding more finetuned benchmarks in the future.

Should you have any query about this benchmark, please email it to <hello@internetobject.org>
