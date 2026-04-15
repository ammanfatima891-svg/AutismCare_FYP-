def classify_probability(probability: float, threshold: float) -> str:
    """
    Convert model probability into a discrete label.

    Convention: probability is P(autistic). Threshold decides autistic vs non_autistic.
    """
    return "autistic" if probability >= threshold else "non_autistic"

