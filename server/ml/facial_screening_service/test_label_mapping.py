import os
import sys

# Allow running this script from repo root without installing as a package.
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from server.ml.facial_screening_service.labeling import classify_probability


def run():
    assert classify_probability(0.50, 0.50) == "autistic"
    assert classify_probability(0.51, 0.50) == "autistic"
    assert classify_probability(0.49, 0.50) == "non_autistic"

    assert classify_probability(0.80, 0.75) == "autistic"
    assert classify_probability(0.74, 0.75) == "non_autistic"

    print("OK: facial screening label mapping tests passed")


if __name__ == "__main__":
    run()

