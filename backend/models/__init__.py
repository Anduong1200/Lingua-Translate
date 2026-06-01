from db.config import Base
from models.dictionary import DictionaryEntryRecord
from models.document import DocumentRecord, PageRecord
from models.annotation import AnnotationRecord
from models.review import ReviewItemRecord, ReviewEventRecord
from models.user import UserProfileRecord, KnownWordRecord, UserCorrectionRecord
from models.vocabulary import VocabularyItemRecord
from models.ai_history import AiRequestRecord, AiCacheRecord, ChatSessionRecord, ChatMessageRecord, AiUserConsentRecord

__all__ = [
    "Base",
    "DictionaryEntryRecord",
    "DocumentRecord",
    "PageRecord",
    "AnnotationRecord",
    "ReviewItemRecord",
    "ReviewEventRecord",
    "UserProfileRecord",
    "KnownWordRecord",
    "UserCorrectionRecord",
    "VocabularyItemRecord",
    "AiRequestRecord",
    "AiCacheRecord",
    "ChatSessionRecord",
    "ChatMessageRecord",
    "AiUserConsentRecord",
]
