def fib(n: int) -> int:
    """Return the n-th Fibonacci number (1-indexed).

    Examples
    --------
    >>> fib(1)
    1
    >>> fib(2)
    1
    >>> fib(5)
    5
    """
    if n <= 0:
        raise ValueError("n must be a positive integer")
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


print(fib(1))  # Output: 1
print(fib(5))  # Output: 5
