from backendlib.sessionmanager import get_session
from backendlib.models import WebappDataInteraction


class DataInteractionLoggerService():
    def __init__(self, authorized_user, interaction_type):
        self.authorized_user = authorized_user
        self.interaction_type = interaction_type
        self.log_object = WebappDataInteraction.create_log_obj(
            interaction_type, authorized_user.user_id,
            authorized_user.user_agent, authorized_user.source_ip)

    def log_interaction(self):
        if self.authorized_user.admin_pw_flag:
            print(
                f"======== NOT LOGGING userId: {self.authorized_user.user_id} interactionType: {self.log_object.interaction_type_id} - ADMIN PW FLAG IS TRUE ======="
            )
        else:
            print(
                f"========= LOGGING userId: {self.authorized_user.user_id} interactionType: {self.log_object.interaction_type_id} =========="
            )
            with get_session() as session:
                session.add(self.log_object)
                session.commit()

    @staticmethod
    def log(log_obj, admin_pw_flag):
        if admin_pw_flag:
            print(
                f"======== NOT LOGGING userId: {log_obj.user_id} interactionType: {log_obj.interaction_type_id} - ADMIN PW FLAG IS TRUE ======="
            )
        else:
            print(
                f"========= LOGGING userId: {log_obj.user_id} interactionType: {log_obj.interaction_type_id} =========="
            )
            with get_session() as session:
                session.add(log_obj)
                session.commit()
